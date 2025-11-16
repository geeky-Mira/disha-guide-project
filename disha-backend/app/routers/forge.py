# app/routers/forge.py
import os
import json
import httpx
import asyncio
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
from app.core.security import verify_firebase_token
from app.core import firestore_utils as fs
from google.cloud.firestore_v1.transforms import ArrayUnion
from typing import List
from app.core import prompts

router = APIRouter()

# -----------------------------------------------------
# GEMINI CONFIG
# -----------------------------------------------------
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent"

quiz_model = genai.GenerativeModel("gemini-2.5-flash")
feedback_model = genai.GenerativeModel("gemini-2.5-flash") # New model for feedback

# -----------------------------------------------------
# MODELS
# -----------------------------------------------------
class AssessmentRequest(BaseModel):
    career_name: str
    skill: str

class ScoreRequest(BaseModel):
    career_name: str
    skill: str
    score: float
    total_questions: int

class ResourceRequest(BaseModel):
    career_name: str
    skill: str

class FeedbackRequest(BaseModel):
    incorrect_questions: List[dict]

# -----------------------------------------------------
# HELPERS
# -----------------------------------------------------
async def _validate_url(client: httpx.AsyncClient, url: str) -> bool:
    """Asynchronously validates a single URL."""
    try:
        response = await client.head(url, follow_redirects=True, timeout=10)
        return response.status_code < 400
    except httpx.RequestError as e:
        print(f"URL validation failed for {url}: {e}")
        return False

async def _validate_resources(resources: list) -> list:
    """Filters a list of resources, returning only those with valid and accessible URLs."""
    async with httpx.AsyncClient() as client:
        validation_tasks = [_validate_url(client, resource.get("url", "")) for resource in resources]
        results = await asyncio.gather(*validation_tasks)
    return [resources[i] for i, is_valid in enumerate(results) if is_valid]

def _extract_json_from_response(text: str) -> dict:
    try:
        json_start = text.find('{')
        json_end = text.rfind('}') + 1
        if json_start == -1 or json_end == 0: return None
        json_str = text[json_start:json_end]
        return json.loads(json_str)
    except (json.JSONDecodeError, IndexError):
        return None

# -----------------------------------------------------
# ROUTES
# -----------------------------------------------------
@router.post("/assessment")
async def generate_assessment(req: AssessmentRequest, user=Depends(verify_firebase_token)):
    """
    Generates a multiple-choice quiz with explanations for each answer.
    """
    # Use the centralized prompt generator
    prompt = prompts.generate_assessment_prompt(req.skill, req.career_name)
    
    try:
        response = quiz_model.generate_content(prompt)
        quiz_json = _extract_json_from_response(response.text)
        if not quiz_json or "questions" not in quiz_json:
            raise HTTPException(status_code=500, detail="Failed to generate a valid quiz from the model.")
        return quiz_json
    except Exception as e:
        print(f"❌ Error generating assessment: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while generating the assessment.")

@router.post("/assessment/save")
async def save_assessment_score(req: ScoreRequest, user=Depends(verify_firebase_token)):
    """
    Saves the user's assessment score to their profile in Firestore.
    """
    user_id = user.get("uid")
    doc_ref = fs.db.collection("users").document(user_id)
    user_doc = doc_ref.get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")

    compass = user_doc.to_dict().get("compass", {})
    saved_paths = compass.get("saved_paths", [])
    
    path_found = False
    for path in saved_paths:
        if path.get("career_name") == req.career_name:
            path_found = True
            skills_status = path.get("skills_status", {})
            skill_data = skills_status.get(req.skill)
            if not isinstance(skill_data, dict):
                skill_data = {}
            skill_data["score"] = req.score
            skill_data["status"] = "complete"
            skills_status[req.skill] = skill_data
            path["skills_status"] = skills_status
            
            completed_count = sum(1 for s in path["skills_status"].values() if isinstance(s, dict) and s.get("status") == "complete")
            total_skills = len(path["skills_status"])
            path["progress"] = round((completed_count / total_skills) * 100) if total_skills > 0 else 0
            break
    
    if not path_found:
        raise HTTPException(status_code=404, detail="Career path not found in user's compass.")

    doc_ref.update({"compass.saved_paths": saved_paths})
    return {"status": "success", "message": "Score saved and progress updated."}

@router.post("/resources")
async def find_learning_resources(req: ResourceRequest, user=Depends(verify_firebase_token)):
    """
    Finds verified learning resources for a given skill and career.
    """
    # Use the centralized prompt generator
    prompt = prompts.find_resources_prompt(req.skill, req.career_name)

    payload = {"contents": [{"parts": [{"text": prompt}]}], "tools": [{"google_search": {}}]}
    headers = {"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY}

    for attempt in range(3):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(GEMINI_API_URL, json=payload, headers=headers, timeout=60)
                if response.status_code == 503:
                    await asyncio.sleep(1 + attempt)
                    continue
                response.raise_for_status()
                api_response = response.json()
                if not api_response.get("candidates"):
                    raise HTTPException(status_code=500, detail="AI response was empty or invalid.")
                parts = api_response["candidates"][0].get("content", {}).get("parts", [])
                resource_json = None
                for part in parts:
                    if part.get("text"):
                        json_from_text = _extract_json_from_response(part["text"])
                        if json_from_text and "resources" in json_from_text:
                            resource_json = json_from_text
                            break
                if resource_json and resource_json.get("resources"):
                    validated_resources = await _validate_resources(resource_json["resources"])
                    if not validated_resources:
                        print(f"Attempt {attempt + 1}: All resource URLs were invalid. Retrying...")
                        continue
                    resource_json["resources"] = validated_resources
                    return resource_json
                continue
        except httpx.HTTPStatusError as e:
            print(f"❌ HTTP Error on attempt {attempt + 1}: {e.response.text}")
            if attempt == 2:
                raise HTTPException(status_code=500, detail="An error occurred while fetching resources.")
        except Exception as e:
            print(f"❌ Unhandled Error on attempt {attempt + 1}: {e}")
            if attempt == 2:
                raise HTTPException(status_code=500, detail="An unexpected error occurred.")
    
    raise HTTPException(status_code=503, detail="The model is currently overloaded or failed to find valid resources. Please try again in a few moments.")

@router.post("/feedback")
async def generate_feedback(req: FeedbackRequest):
    """
    Analyzes incorrect quiz answers and generates a list of topics to improve on.
    """
    if not req.incorrect_questions:
        return {"topics": []}

    # Use the centralized prompt generator
    prompt = prompts.generate_feedback_prompt(req.incorrect_questions)
    
    try:
        response = feedback_model.generate_content(prompt)
        feedback_json = _extract_json_from_response(response.text)
        if not feedback_json or "topics" not in feedback_json:
            return {"topics": ["Could not determine specific topics, but please review the explanations for the questions you got wrong."]}
        return feedback_json
    except Exception as e:
        print(f"❌ Error generating feedback: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while generating feedback.")
