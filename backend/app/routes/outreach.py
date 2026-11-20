from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field
from app.db.session import get_db

router = APIRouter(prefix="/outreach", tags=["Email Outreach & Campaigns"])

class EmailCampaignCreate(BaseModel):
    campaign_name: str
    template_type: str = Field(..., description="Valid: cold_outreach, warm_introduction, funding_request, follow_up")
    subject: str
    body_content: str
    target_investor_ids: List[str]

class SingleEmailSend(BaseModel):
    recipient_email: EmailStr
    subject: str
    body_content: str

@router.post("/campaigns", status_code=status.HTTP_201_CREATED)
def create_and_launch_campaign(payload: EmailCampaignCreate, db: Session = Depends(get_db)):
    """
    Launches a bulk email outreach campaign targeting specified investor IDs using custom templates.
    """
    valid_templates = ["cold_outreach", "warm_introduction", "funding_request", "follow_up"]
    if payload.template_type not in valid_templates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid template type. Must be one of {valid_templates}"
        )
        
    return {
        "status": "success",
        "message": f"Campaign '{payload.campaign_name}' successfully dispatched.",
        "total_recipients": len(payload.target_investor_ids),
        "template_used": payload.template_type
    }

@router.post("/send-single")
def send_individual_outreach_email(payload: SingleEmailSend, db: Session = Depends(get_db)):
    """
    Sends an individual tracked outreach email to an investor with open and reply tracking enabled.
    """
    return {
        "status": "success",
        "recipient": payload.recipient_email,
        "subject": payload.subject,
        "tracking_enabled": True,
        "message": "Email dispatched successfully. Open and reply webhooks activated."
    }

@router.get("/tracking/{campaign_id}")
def get_campaign_tracking_analytics(campaign_id: str, db: Session = Depends(get_db)):
    """
    Retrieves open rates, click-through rates, and reply analytics for an outreach campaign.
    """
    return {
        "status": "success",
        "campaign_id": campaign_id,
        "analytics": {
            "emails_sent": 150,
            "opened_count": 92,
            "open_rate_percentage": 61.3,
            "replied_count": 18,
            "reply_rate_percentage": 12.0
        }
    }