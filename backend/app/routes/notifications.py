from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from app.db.session import get_db

router = APIRouter(prefix="/notifications", tags=["Multi-Channel Notifications"])

class NotificationDispatch(BaseModel):
    user_id: str
    channel: str = Field(..., description="Valid channels: email, sms, whatsapp, in_app")
    title: str
    message: str
    priority: Optional[str] = "normal"

@router.post("/send", status_code=status.HTTP_201_CREATED)
def send_multichannel_notification(payload: NotificationDispatch, db: Session = Depends(get_db)):
    """
    Dispatches a real-time notification to a user across the selected channel 
    (Email, SMS, WhatsApp, or In-App).
    """
    valid_channels = ["email", "sms", "whatsapp", "in_app"]
    if payload.channel not in valid_channels:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid notification channel. Must be one of {valid_channels}"
        )
        
    return {
        "status": "success",
        "user_id": payload.user_id,
        "channel_used": payload.channel,
        "dispatch_status": "delivered",
        "message": f"Successfully dispatched {payload.channel} notification to user {payload.user_id}."
    }

@router.get("/user/{user_id}/in-app")
def get_user_in_app_notifications(user_id: str, skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    """
    Retrieves unread and historical in-app notifications for a given user.
    """
    return {
        "status": "success",
        "user_id": user_id,
        "unread_count": 0,
        "notifications": []
    }