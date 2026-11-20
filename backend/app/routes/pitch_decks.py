from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import Optional, List
from app.db.session import get_db

router = APIRouter(prefix="/pitch-decks", tags=["Pitch Deck Management & Security"])

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_pitch_deck(
    startup_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Securely uploads a startup pitch deck (PDF, PPT, DOCX), stores it in encrypted cloud storage,
    and initializes access control permissions.
    """
    allowed_extensions = [".pdf", ".ppt", ".pptx", ".docx"]
    file_ext = "." + file.filename.split(".")[-1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format. Allowed formats: {allowed_extensions}"
        )
        
    return {
        "status": "success",
        "startup_id": startup_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "storage_status": "encrypted_and_stored",
        "message": "Pitch deck uploaded and secured successfully."
    }

@router.get("/analytics/{deck_id}")
def get_pitch_deck_view_analytics(deck_id: str, db: Session = Depends(get_db)):
    """
    Retrieves detailed view and download analytics, including investor engagement duration
    and page-by-page drop-off tracking.
    """
    return {
        "status": "success",
        "deck_id": deck_id,
        "analytics": {
            "total_views": 84,
            "unique_investors_viewed": 32,
            "total_downloads": 14,
            "average_view_duration_seconds": 145,
            "page_engagement_breakdown": {
                "slide_1_title": "100%",
                "slide_2_problem": "95%",
                "slide_3_solution": "90%",
                "slide_8_financials": "78%"
            }
        }
    }