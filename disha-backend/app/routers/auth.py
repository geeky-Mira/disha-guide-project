from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.core.firebase import firebase_auth

router = APIRouter(tags=["auth"])

class EmailCheckRequest(BaseModel):
    email: EmailStr

@router.post("/check-email")
async def check_email_exists(req: EmailCheckRequest):
    """
    Checks if a user exists in Firebase Authentication based on their email.
    This is used to provide a better UX for the password reset flow.
    """
    try:
        firebase_auth.get_user_by_email(req.email)
        return {"exists": True}
    except firebase_auth.UserNotFoundError:
        return {"exists": False}
    except Exception as e:
        # Log the unexpected error for debugging
        print(f"Unexpected error in check-email: {e}")
        # Return a generic error to the client
        raise HTTPException(status_code=500, detail="An internal error occurred.")

@router.post("/login")
async def login():
    """
    Placeholder login endpoint.
    """
    return {"message": "Login is handled via Firebase client SDK."}

@router.post("/signup")
async def signup():
    """
    Placeholder signup endpoint.
    """
    return {"message": "Signup is handled via Firebase client SDK."}
