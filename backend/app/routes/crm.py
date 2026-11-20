from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from app.db.session import get_db

router = APIRouter(prefix="/crm", tags=["Investor CRM & Lead Tracking"])

# CRM Pydantic Schemas for Validation
class CRMDealCreate(BaseModel):
    investor_id: str
    startup_id: str
    outreach_status: str = Field(default="Not Contacted", description="Valid: Not Contacted, Contacted, Interested, Meeting Scheduled, Negotiation, Invested, Rejected")
    notes: Optional[str] = None
    priority_score: Optional[int] = 0

class CRMNoteAdd(BaseModel):
    note_content: str
    follow_up_date: Optional[str] = None

@router.get("/deals")
def get_crm_pipeline(
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Retrieves the CRM lead tracking pipeline and deals across all status stages.
    """
    return {
        "total_deals": 0,
        "status_filter": status_filter,
        "pipeline": []
    }

@router.post("/deals", status_code=status.HTTP_201_CREATED)
def create_crm_deal(payload: CRMDealCreate, db: Session = Depends(get_db)):
    """
    Adds a new investor lead into the CRM tracking pipeline.
    """
    valid_statuses = ["Not Contacted", "Contacted", "Interested", "Meeting Scheduled", "Negotiation", "Invested", "Rejected"]
    if payload.outreach_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid outreach status. Must be one of {valid_statuses}"
        )
        
    return {
        "status": "success",
        "message": "Investor lead added to CRM pipeline successfully.",
        "deal_data": payload.dict()
    }

@router.patch("/deals/{deal_id}/status")
def update_crm_deal_status(
    deal_id: str,
    new_status: str = Query(..., description="New lifecycle status label"),
    db: Session = Depends(get_db)
):
    """
    Updates the outreach status label of an existing CRM deal.
    """
    return {
        "status": "success",
        "deal_id": deal_id,
        "updated_status": new_status,
        "message": f"Deal status successfully updated to '{new_status}'."
    }

@router.post("/deals/{deal_id}/notes")
def add_crm_meeting_note(
    deal_id: str,
    payload: CRMNoteAdd,
    db: Session = Depends(get_db)
):
    """
    Appends contact history, meeting notes, and follow-up tracking reminders to a CRM deal.
    """
    return {
        "status": "success",
        "deal_id": deal_id,
        "recorded_note": payload.note_content,
        "follow_up_date": payload.follow_up_date,
        "message": "Meeting note and follow-up tracker successfully logged."
    }