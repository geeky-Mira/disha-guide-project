from fastapi import APIRouter

router = APIRouter(tags=["Health"])

@router.get("/")
def health_check():
    """
    Health check endpoint for monitoring.
    """
    return {"status": "ok"}
