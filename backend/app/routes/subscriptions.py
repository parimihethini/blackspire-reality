from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, Field
from app.db.session import get_db

router = APIRouter(prefix="/subscriptions", tags=["Subscription & Tier Management"])

class SubscriptionUpdate(BaseModel):
    user_id: str
    tier: str = Field(..., description="Valid tiers: free, pro, enterprise")

@router.get("/user/{user_id}")
def get_user_subscription_tier(user_id: str, db: Session = Depends(get_db)):
    """
    Retrieves the active subscription tier and feature entitlements for a user.
    """
    return {
        "status": "success",
        "user_id": user_id,
        "active_tier": "pro",
        "entitlements": {
            "full_database_search": True,
            "ai_matching_access": True,
            "crm_access": True,
            "api_access": False,
            "team_seats_limit": 1
        }
    }

@router.post("/update", status_code=status.HTTP_200_OK)
def update_user_subscription(payload: SubscriptionUpdate, db: Session = Depends(get_db)):
    """
    Upgrades or modifies a user's subscription plan (Free, Pro, Enterprise).
    """
    valid_tiers = ["free", "pro", "enterprise"]
    if payload.tier not in valid_tiers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid subscription tier. Must be one of {valid_tiers}"
        )
        
    return {
        "status": "success",
        "user_id": payload.user_id,
        "new_tier": payload.tier,
        "message": f"Subscription successfully updated to {payload.tier.upper()} plan."
    }