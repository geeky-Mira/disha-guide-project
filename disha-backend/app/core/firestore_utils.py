# app/core/firestore_utils.py
import os
import uuid
from datetime import datetime
from app.core.firebase import db  # Import the centralized db client
from dotenv import load_dotenv

load_dotenv()

# -----------------------------------------------------
# FIRESTORE SETUP (REMOVED - Handled by firebase.py)
# -----------------------------------------------------
print(f"[INFO] Firestore client imported from core.firebase")

# -----------------------------------------------------
# CONSTANTS
# -----------------------------------------------------
PROFILE_SKELETON = {
    "name": "",
    "education": "",
    "skills": [],
    "interests": [],
    "career_goals": ""
}

# -----------------------------------------------------
# USER UTILITIES
# -----------------------------------------------------
def get_user(user_id: str):
    snap = db.collection("users").document(user_id).get()
    return snap.to_dict() if snap.exists else None


def ensure_user_document(user_id: str, email: str | None = None):
    """Guarantee user document structure with all necessary fields."""
    ref = db.collection("users").document(user_id)
    snap = ref.get()

    if not snap.exists:
        base_doc = {
            "email": email or "",
            "profile": PROFILE_SKELETON.copy(),
            "chats": [],
            "compass": {
                "recommendations": [],
                "saved_paths": []
            }
        }
        ref.set(base_doc)
        print(f"[Init] Created new user doc for {user_id}")
        return base_doc

    data = snap.to_dict() or {}
    modified = False

    # Ensure profile skeleton
    profile = data.get("profile", {})
    for k, v in PROFILE_SKELETON.items():
        if k not in profile:
            profile[k] = v
            modified = True
    data["profile"] = profile

    # Ensure compass structure
    compass = data.get("compass", {})
    if not isinstance(compass, dict):
        compass = {}
        modified = True
    if "recommendations" not in compass:
        compass["recommendations"] = []
        modified = True
    if "saved_paths" not in compass:
        compass["saved_paths"] = []
        modified = True
    data["compass"] = compass

    # Ensure chats array
    if "chats" not in data or not isinstance(data["chats"], list):
        data["chats"] = []
        modified = True

    # Ensure email field
    if email and data.get("email") != email:
        data["email"] = email
        modified = True

    if modified:
        ref.set(data, merge=True)
        print(f"[Fix] Ensured schema for user {user_id}")

    return data


def upsert_user(user_id: str, data: dict):
    db.collection("users").document(user_id).set(data, merge=True)
    print(f"[Upsert] {user_id} → keys: {list(data.keys())}")
    return {"ok": True}

# -----------------------------------------------------
# CHAT UTILITIES
# -----------------------------------------------------
def save_chat_turn(user_id: str, user_text: str, ai_text: str, email: str | None = None):
    now = datetime.utcnow().isoformat()
    chat_id = str(uuid.uuid4())

    new_turn = {
        "id": chat_id,
        "user": {"text": user_text, "timestamp": now},
        "ai": {"text": ai_text, "timestamp": now},
    }

    ref = db.collection("users").document(user_id)
    ensure_user_document(user_id, email=email)
    snap = ref.get()
    data = snap.to_dict() or {}
    chats = data.get("chats", [])
    chats.append(new_turn)
    ref.update({"chats": chats})
    print(f"[Chat] Saved turn {chat_id} for {user_id}, total chats: {len(chats)}")

    return chat_id


def get_chat_history(user_id: str, limit: int | None = None):
    doc = db.collection("users").document(user_id).get()
    if not doc.exists:
        return []
    data = doc.to_dict() or {}
    chats = data.get("chats", [])
    return chats[-limit:] if limit else chats


def delete_chat_history(user_id: str):
    ref = db.collection("users").document(user_id)
    ensure_user_document(user_id)
    ref.update({"chats": []})
    print(f"[Chat] Cleared chats for {user_id}")


def delete_single_message(user_id: str, message_id: str):
    ref = db.collection("users").document(user_id)
    snap = ref.get()
    if not snap.exists:
        return {"ok": False, "msg": "User not found"}
    data = snap.to_dict() or {}
    chats = [c for c in data.get("chats", []) if c.get("id") != message_id]
    ref.update({"chats": chats})
    print(f"[Chat] Deleted message {message_id} for {user_id}")
    return {"ok": True}

# -----------------------------------------------------
# PROFILE MANAGEMENT
# -----------------------------------------------------
def get_user_profile(user_id: str):
    user_data = get_user(user_id)
    if not user_data:
        return None
    profile = user_data.get("profile", {})
    full_profile = PROFILE_SKELETON.copy()
    full_profile.update(profile)
    return {"email": user_data.get("email", ""), "profile": full_profile}


def update_user_profile(user_id: str, updates: dict):
    """Merge profile updates while preserving existing non-empty fields."""
    ref = db.collection("users").document(user_id)
    ensure_user_document(user_id)
    snap = ref.get()
    data = snap.to_dict() or {}
    profile = data.get("profile", PROFILE_SKELETON.copy())

    for key, val in updates.items():
        if key not in PROFILE_SKELETON:
            continue
        if key in ("skills", "interests"):
            existing = profile.get(key, [])
            if isinstance(val, list):
                profile[key] = list(dict.fromkeys(existing + val))
            elif isinstance(val, str) and val not in existing:
                profile[key] = existing + [val]
        elif val:
            profile[key] = val

    for k, v in PROFILE_SKELETON.items():
        if k not in profile:
            profile[k] = v

    ref.set({"profile": profile}, merge=True)
    print(f"[Profile] Updated {user_id} → {profile}")
    return {"ok": True, "profile": profile}

# -----------------------------------------------------
# COMPASS MANAGEMENT
# -----------------------------------------------------
def get_user_compass(user_id: str):
    ensure_user_document(user_id)
    doc = db.collection("users").document(user_id).get()
    if not doc.exists:
        return {}
    data = doc.to_dict() or {}
    # Ensure the compass structure is valid before returning
    compass = data.get("compass", {})
    if not isinstance(compass, dict):
        return {"recommendations": [], "saved_paths": []}
    if "recommendations" not in compass:
        compass["recommendations"] = []
    if "saved_paths" not in compass:
        compass["saved_paths"] = []
    return compass


def update_compass_recommendations(user_id: str, recommendations: list):
    """
    Updates the 'recommendations' list in the user's compass document.
    """
    ensure_user_document(user_id)
    ref = db.collection("users").document(user_id)

    update_data = {
        "compass.recommendations": recommendations,
        "compass.lastUpdated": datetime.utcnow().isoformat()
    }

    ref.update(update_data)
    print(f"[Compass] Updated {user_id} with {len(recommendations)} recommendations")
    return {"ok": True, "count": len(recommendations)}

# -----------------------------------------------------
# COMBINED ACCESS
# -----------------------------------------------------
def get_full_user_data(user_id: str):
    """Return unified data block: profile + compass + email."""
    ensure_user_document(user_id)
    doc = db.collection("users").document(user_id).get()
    if not doc.exists:
        return {}
    data = doc.to_dict() or {}
    return {
        "email": data.get("email", ""),
        "profile": data.get("profile", PROFILE_SKELETON.copy()),
        "compass": data.get("compass", {})
    }

# -----------------------------------------------------
# HEURISTIC COMPASS GENERATOR (optional, kept for dev)
# -----------------------------------------------------
def generate_compass_from_profile(profile: dict):
    skills = profile.get("skills", [])
    interests = profile.get("interests", [])
    goal = profile.get("career_goals", "")
    name = profile.get("name", "")

    if not (skills or interests or goal):
        return []

    now = datetime.utcnow().isoformat()
    suggestions = []

    if "data" in goal.lower() or any("data" in s.lower() for s in skills):
        suggestions.append({
            "career_name": "Data Scientist",
            "description": f"A path for {name or 'you'} focusing on data-driven insights.",
            "pathway": ["Learn Python", "Study stats", "Build ML models"]
        })

    if any("ai" in i.lower() or "ml" in i.lower() for i in interests):
        suggestions.append({
            "career_name": "Machine Learning Engineer",
            "description": "Build and deploy AI systems end-to-end.",
            "pathway": ["Math foundations", "Deep learning frameworks", "MLOps"]
        })

    if not suggestions:
        suggestions.append({
            "career_name": "General Growth Path",
            "description": "Keep learning and expanding your skill base.",
            "pathway": ["Identify interests", "Set goals", "Network actively"]
        })

    print(f"[CompassGen] Generated {len(suggestions)} heuristic suggestions")
    return {"career_recommendations": suggestions}
