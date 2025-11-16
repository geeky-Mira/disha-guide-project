# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, users, career, health, chat, forge
from app.core import firebase  # ensures Firebase Admin SDK is initialized

app = FastAPI(
    title="Disha Backend",
    description="Backend API for Disha Guide – The Personalized Career Architect",
    version="0.1.0",
)

# ✅ Allow local and deployed frontend to talk to backend
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://disha-guide-project.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Welcome to Disha Backend"}

# ✅ Register all routers
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(career.router, prefix="/career", tags=["Career"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(forge.router, prefix="/forge", tags=["Skill Forge"])
app.include_router(health.router, prefix="/ping", tags=["Health"])
