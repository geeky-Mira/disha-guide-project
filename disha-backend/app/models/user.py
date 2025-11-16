from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
import uuid


# ---------- Message Schema ----------
class Message(BaseModel):
    role: str  # "user", "assistant", or "system"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ---------- Chat Schema ----------
class Chat(BaseModel):
    chat_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    messages: List[Message] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ---------- User Profile Schema ----------
class UserProfile(BaseModel):
    uid: Optional[str] = None  # 🔹 Added for Firestore document ID tracking
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    education: Optional[str] = None
    career_goals: Optional[str] = None  # 🔹 Added since frontend uses it
    interests: List[str] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    chats: List[Chat] = Field(default_factory=list)

    class Config:
        from_attributes = True  # Enables easy serialization/deserialization
