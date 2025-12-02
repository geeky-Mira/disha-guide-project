# app/routers/chat.py
import os
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
import google.generativeai as genai

from app.core.security import verify_firebase_token
from app.core import firestore_utils as fs
from app.models.user import UserProfile
from app.core import prompts

router = APIRouter()
load_dotenv()

# -----------------------------------------------------
# GEMINI CONFIG
# -----------------------------------------------------
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Models now use centralized system instructions from prompts.py
chat_model = genai.GenerativeModel(
    "gemini-2.0-flash-001",
    system_instruction=prompts.CHAT_MODEL_INSTRUCTION
)
profile_model = genai.GenerativeModel(
    "gemini-2.0-flash-001",
    system_instruction=prompts.PROFILE_EXTRACTION_INSTRUCTION
)
career_model = genai.GenerativeModel(
    "gemini-2.0-flash-001",
    system_instruction=prompts.CAREER_RECOMMENDATION_INSTRUCTION
)

# -----------------------------------------------------
# MODELS
# -----------------------------------------------------
class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    history: List[Dict[str, Any]]
    turn: Optional[Dict[str, Any]] = None


# -----------------------------------------------------
# HELPERS
# -----------------------------------------------------
def _extract_text_from_genai(resp) -> str:
    try:
        if getattr(resp, "text", None):
            return resp.text
    except Exception:
        pass
    try:
        candidates = getattr(resp, "candidates", None)
        if candidates:
            cand = candidates[0]
            content = getattr(cand, "content", None)
            if isinstance(content, str):
                return content
            if isinstance(content, list):
                return " ".join(
                    p if isinstance(p, str) else p.get("text") or str(p)
                    for p in content
                )
    except Exception:
        pass
    return str(resp)


async def _extract_profile_from_history(history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Asynchronously generate structured profile JSON from user messages."""
    loop = asyncio.get_running_loop()
    
    user_messages = [
        f"User: {turn['user']['text']}"
        for turn in history
        if turn.get("user", {}).get("text")
    ]
    transcript = "\n".join(user_messages)

    if not transcript:
        return {}

    # Use the centralized prompt generator
    prompt = prompts.get_profile_extraction_prompt(transcript)
    
    resp = await loop.run_in_executor(None, lambda: profile_model.generate_content(prompt))
    
    profile_text = _extract_text_from_genai(resp).strip()
    json_start = profile_text.find("{")
    json_end = profile_text.rfind("}") + 1
    if json_start != -1 and json_end > json_start:
        profile_text = profile_text[json_start:json_end]

    try:
        data = json.loads(profile_text)
    except Exception:
        print(f"[WARN] Could not parse profile JSON: {profile_text}")
        data = {}

    return data


async def _update_user_profile(user_id: str, history: List[Dict[str, Any]], email: str):
    """Asynchronously extract structured profile info and update Firestore."""
    try:
        if not history:
            return {}

        profile_data = await _extract_profile_from_history(history)

        try:
            profile_obj = UserProfile(**profile_data)
            validated = profile_obj.dict(exclude_none=True)
        except Exception as e:
            print(f"[WARN] Profile validation failed: {e}")
            validated = profile_data

        await asyncio.to_thread(fs.ensure_user_document, user_id, email=email)
        await asyncio.to_thread(fs.update_user_profile, user_id, validated)
        
        print(f"[Profile Updated] {user_id} ", "\u2192", " {validated}")
        return validated

    except Exception as e:
        print(f"[WARN] Profile extraction failed: {e}")
        return {}


def _is_profile_ready(profile: Dict[str, Any]) -> bool:
    """Check if profile has all required info to recommend careers."""
    if not profile:
        return False
    
    has_education = bool(profile.get("education"))
    has_skills = bool(profile.get("skills"))
    has_interests = bool(profile.get("interests"))
    has_goal = bool(profile.get("career_goals"))
    
    return has_education and has_skills and has_interests and has_goal


async def _update_compass_recommendations(user_id: str, profile_data: Dict[str, Any]):
    """
    Asynchronously generates career recommendations, saves them to Firestore,
    and returns the generated list.
    """
    loop = asyncio.get_running_loop()
    try:
        if not _is_profile_ready(profile_data):
            print("[INFO] Skipping compass update ", "\u2014", " profile incomplete.")
            return []

        # Use the centralized prompt generator
        prompt = prompts.get_career_recommendation_prompt(profile_data)

        resp = await loop.run_in_executor(None, lambda: career_model.generate_content(prompt))
        text = _extract_text_from_genai(resp).strip()
        list_start = text.find("[")
        list_end = text.rfind("]") + 1
        if list_start != -1 and list_end > list_start:
            text = text[list_start:list_end]

        recommendations = json.loads(text)
        if isinstance(recommendations, list) and recommendations:
            await asyncio.to_thread(fs.update_compass_recommendations, user_id, recommendations)
            print(f"[Compass Updated] {user_id} ", "\u2192", " {len(recommendations)} recommendations stored.")
            return recommendations
        else:
            print("[INFO] No valid career recommendations parsed.")
            return []

    except Exception as e:
        print(f"[WARN] Compass update failed: {e}")
        return []


# -----------------------------------------------------
# ROUTES
# -----------------------------------------------------
@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest, user=Depends(verify_firebase_token)):
    """Main conversational endpoint."""
    try:
        user_id = user.get("uid")
        email = user.get("email")
        user_message = req.message.strip()
        if not user_message:
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        await asyncio.to_thread(fs.ensure_user_document, user_id, email=email)
        history = await asyncio.to_thread(fs.get_chat_history, user_id) or []

        temp_history_for_extraction = history + [{
            "user": {"text": user_message},
            "ai": {"text": ""},
            "id": "temp" 
        }]

        async def update_profile_and_compass():
            profile_data = await _update_user_profile(user_id, temp_history_for_extraction, email)
            if _is_profile_ready(profile_data):
                await _update_compass_recommendations(user_id, profile_data)

        asyncio.create_task(update_profile_and_compass())

        transcript_parts = []
        for turn in history:
            if turn.get("user", {}).get("text"):
                transcript_parts.append(f"User: {turn['user']['text']}")
            if turn.get("ai", {}).get("text"):
                transcript_parts.append(f"AI: {turn['ai']['text']}")
        transcript_parts.append(f"User: {user_message}")
        conversation_text = "\n".join(transcript_parts)

        # Use the centralized prompt generator
        prompt = prompts.get_chat_prompt(conversation_text)

        gemini_response = await asyncio.get_running_loop().run_in_executor(
            None, lambda: chat_model.generate_content(prompt)
        )
        ai_reply = _extract_text_from_genai(gemini_response) or "Sorry, I couldn't form an answer."

        new_turn_id = await asyncio.to_thread(fs.save_chat_turn, user_id, user_message, ai_reply, email=email)
        updated_history = await asyncio.to_thread(fs.get_chat_history, user_id) or []
        
        saved_turn = next((t for t in updated_history if t.get("id") == new_turn_id), None)
        return ChatResponse(reply=ai_reply, history=updated_history, turn=saved_turn)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Chat exception: {e}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.get("/history")
async def get_history(user=Depends(verify_firebase_token)):
    user_id = user.get("uid")
    fs.ensure_user_document(user_id)
    history = fs.get_chat_history(user_id)
    return {"history": history}


@router.delete("/all")
@router.delete("/clear")
async def clear_history(user=Depends(verify_firebase_token)):
    user_id = user.get("uid")
    fs.delete_chat_history(user_id)
    return {"message": "All chat history cleared"}


@router.delete("/{message_id}")
async def delete_message(message_id: str, user=Depends(verify_firebase_token)):
    user_id = user.get("uid")
    fs.delete_single_message(user_id, message_id)
    return {"message": f"Message {message_id} deleted"}


@router.post("/recommendations/refresh")
async def refresh_recommendations(user=Depends(verify_firebase_token)):
    """
    Generates new career recommendations for the user based on their current profile
    and overwrites the old ones.
    """
    user_id = user.get("uid")
    user_data = fs.get_user_profile(user_id)

    if not user_data or "profile" not in user_data:
        raise HTTPException(status_code=404, detail="User profile not found or is incomplete.")

    user_profile = user_data["profile"]

    try:
        new_recommendations = await _update_compass_recommendations(user_id, user_profile)
        
        return {
            "status": "success",
            "message": "Recommendations have been refreshed.",
            "recommendations": new_recommendations
        }

    except Exception as e:
        print(f"❌ Error refreshing recommendations: {e}")
        raise HTTPException(status_code=500, detail="Failed to refresh recommendations.")
