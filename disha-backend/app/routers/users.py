# app/routers/users.py
from fastapi import APIRouter, HTTPException, Depends
from app.models.user import UserProfile
from app.core.security import verify_firebase_token
from app.core import firestore_utils as fs
from app.core.firebase import firebase_auth # Import the admin auth module

router = APIRouter()

# ---------------------------------------------------------
# USER PROFILE MANAGEMENT
# ---------------------------------------------------------
@router.post("/{user_id}")
def upsert_user_profile(
    user_id: str,
    profile: UserProfile,
    decoded_token: dict = Depends(verify_firebase_token)
):
    """
    Create or update (upsert) user profile.
    """
    if user_id != decoded_token.get("uid"):
        raise HTTPException(status_code=403, detail="User ID mismatch")

    profile_data = profile.dict(exclude_none=True)
    
    fs.upsert_user(
        user_id,
        {"email": decoded_token.get("email"), "profile": profile_data}
    )
    
    return {
        "ok": True,
        "message": "User profile saved.",
        "userId": user_id,
    }


@router.get("/{user_id}")
def fetch_user_profile(
    user_id: str,
    decoded_token: dict = Depends(verify_firebase_token)
):
    """Fetch full Firestore user document."""
    if user_id != decoded_token.get("uid"):
        raise HTTPException(status_code=403, detail="User ID mismatch")

    user_data = fs.get_user(user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    return user_data


@router.delete("/me")
def delete_current_user(decoded_token: dict = Depends(verify_firebase_token)):
    """
    Deletes the currently authenticated user's account from Firebase Auth
    and their corresponding data from Firestore.
    """
    user_id = decoded_token.get("uid")
    
    try:
        # 1. Delete the user from Firebase Authentication
        firebase_auth.delete_user(user_id)
        
        # 2. Delete the user's document from Firestore
        fs.db.collection("users").document(user_id).delete()
        
        return {"status": "success", "message": f"User {user_id} and all their data have been deleted."}

    except firebase_auth.UserNotFoundError:
        # If the auth user doesn't exist, still try to delete Firestore data
        fs.db.collection("users").document(user_id).delete()
        # This is a client-side error, so a 404 is appropriate.
        raise HTTPException(status_code=404, detail="User not found.")
    except Exception as e:
        # For all other unexpected errors, log the detail but return a generic message.
        print(f"❌ An unexpected error occurred during account deletion: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred during account deletion.")



