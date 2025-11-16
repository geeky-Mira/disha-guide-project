# app/routers/career.py
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from app.core.security import verify_firebase_token
from app.core import firestore_utils as fs
from google.cloud.firestore_v1.transforms import ArrayUnion

router = APIRouter()

class CareerRemoveRequest(BaseModel):
    career_name: str

class SkillUpdateRequest(BaseModel):
    career_name: str
    skill: str
    is_complete: bool

@router.get("/recommendations")
async def get_recommendations(user=Depends(verify_firebase_token)):
    user_id = user.get("uid")
    compass_data = fs.get_user_compass(user_id)
    return {"recommendations": compass_data.get("recommendations", [])}

@router.post("/compass/add")
async def add_to_compass(
    career_data: dict = Body(...), 
    user=Depends(verify_firebase_token)
):
    user_id = user.get("uid")
    
    if not all(k in career_data for k in ["career_name", "description", "pathway", "education_pathway"]):
        raise HTTPException(status_code=400, detail="Invalid career data provided.")

    user_doc = fs.get_user(user_id)
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    compass = user_doc.get("compass", {})
    saved_paths = compass.get("saved_paths", [])
    
    if any(p.get("career_name") == career_data["career_name"] for p in saved_paths):
        return {"status": "info", "message": "This career is already in your Compass."}

    user_skills = {s.lower() for s in user_doc.get("profile", {}).get("skills", [])}
    pathway_skills = career_data.get("pathway", [])
    
    skills_status = {
        skill: {
            "status": "complete" if skill.lower() in user_skills else "pending",
            "score": 100 if skill.lower() in user_skills else None
        }
        for skill in pathway_skills
    }
    
    completed_count = sum(1 for data in skills_status.values() if data["status"] == "complete")
    total_skills = len(pathway_skills)
    initial_progress = round((completed_count / total_skills) * 100) if total_skills > 0 else 0

    new_path = {
        **career_data,
        "progress": initial_progress,
        "skills_status": skills_status
    }
    saved_paths.append(new_path)
    
    fs.db.collection("users").document(user_id).update({"compass.saved_paths": saved_paths})
    
    return {"status": "success", "message": f"'{career_data['career_name']}' added."}

@router.get("/compass")
async def get_compass(user=Depends(verify_firebase_token)):
    user_id = user.get("uid")
    compass_data = fs.get_user_compass(user_id)
    return {"compass": compass_data.get("saved_paths", [])}

@router.post("/compass/skill/update")
async def update_skill_status(
    req: SkillUpdateRequest,
    user=Depends(verify_firebase_token)
):
    user_id = user.get("uid")
    doc_ref = fs.db.collection("users").document(user_id)
    user_doc = doc_ref.get()

    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not. found")

    compass = user_doc.to_dict().get("compass", {})
    saved_paths = compass.get("saved_paths", [])
    
    path_found = False
    skill_newly_completed = False
    for path in saved_paths:
        if path.get("career_name") == req.career_name:
            path_found = True
            skills_status = path.get("skills_status", {})
            
            # --- Robust Update Logic ---
            skill_data = skills_status.get(req.skill)
            if not isinstance(skill_data, dict):
                skill_data = {} # Create a new dict if it's not one

            current_status = skill_data.get("status", "pending")
            new_status = "complete" if req.is_complete else "pending"
            
            if current_status != "complete" and new_status == "complete":
                skill_newly_completed = True

            skill_data["status"] = new_status
            skills_status[req.skill] = skill_data
            path["skills_status"] = skills_status
            # --- End of Robust Update Logic ---
            
            completed = sum(1 for s in path["skills_status"].values() if isinstance(s, dict) and s.get("status") == "complete")
            total = len(path["skills_status"])
            path["progress"] = round((completed / total) * 100) if total > 0 else 0
            break
    
    if not path_found:
        raise HTTPException(status_code=404, detail="Career path or skill not found.")

    # Per user request, checking a pathway item only updates progress in the compass.
    # It does not add the item to the main user profile's skills list.
    doc_ref.update({"compass.saved_paths": saved_paths})
    
    return {"status": "success", "message": "Skill status updated."}

@router.delete("/compass/remove")
async def remove_from_compass(
    req: CareerRemoveRequest,
    user=Depends(verify_firebase_token)
):
    user_id = user.get("uid")
    compass = fs.get_user_compass(user_id)
    
    updated_paths = [p for p in compass.get("saved_paths", []) if p.get("career_name") != req.career_name]

    if len(updated_paths) == len(compass.get("saved_paths", [])):
        raise HTTPException(status_code=404, detail=f"Career '{req.career_name}' not found.")

    fs.db.collection("users").document(user_id).update({"compass.saved_paths": updated_paths})
    return {"status": "success", "message": f"'{req.career_name}' removed."}