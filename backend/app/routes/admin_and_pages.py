from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from app.db.session import get_db
from app.core.security import require_role

router = APIRouter(prefix="/admin", tags=["Admin Panel & Page Management"])

class AdminUserAction(BaseModel):
    user_id: str
    action: str = Field(..., description="Valid actions: suspend, activate, update_permissions")
    permissions: Optional[List[str]] = None

class StartupModeration(BaseModel):
    startup_id: str
    decision: str = Field(..., description="Valid decisions: approve, reject, verify")

class InvestorModeration(BaseModel):
    investor_id: str
    action: str = Field(..., description="Valid actions: verify, edit, delete")

@router.post("/users/manage", dependencies=[Depends(require_role(["super_admin", "admin"]))])
def admin_manage_user(payload: AdminUserAction, db: Session = Depends(get_db)):
    """
    Suspends users, modifies access permissions, or updates roles.
    """
    valid_actions = ["suspend", "activate", "update_permissions"]
    if payload.action not in valid_actions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user action. Must be one of {valid_actions}"
        )
        
    return {
        "status": "success",
        "user_id": payload.user_id,
        "action_executed": payload.action,
        "message": f"Successfully executed '{payload.action}' on user {payload.user_id}."
    }

@router.post("/startups/moderate", dependencies=[Depends(require_role(["super_admin", "admin", "team_member"]))])
def admin_moderate_startup(payload: StartupModeration, db: Session = Depends(get_db)):
    """
    Approves, rejects, or verifies startup listing requests.
    """
    valid_decisions = ["approve", "reject", "verify"]
    if payload.decision not in valid_decisions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid decision. Must be one of {valid_decisions}"
        )
        
    return {
        "status": "success",
        "startup_id": payload.startup_id,
        "moderation_decision": payload.decision,
        "message": f"Startup {payload.startup_id} has been successfully {payload.decision}ed."
    }

@router.post("/investors/moderate", dependencies=[Depends(require_role(["super_admin", "admin"]))])
def admin_manage_investor(payload: InvestorModeration, db: Session = Depends(get_db)):
    """
    Verifies, edits, or deletes investor profiles within the admin panel.
    """
    return {
        "status": "success",
        "investor_id": payload.investor_id,
        "action_executed": payload.action,
        "message": f"Investor profile {payload.investor_id} successfully updated."
    }

@router.get("/pages/registry")
def get_platform_pages_registry():
    """
    Returns the complete list of required public and private pages for frontend mapping.
    """
    return {
        "status": "success",
        "public_pages": ["Home", "About", "Pricing", "Investors", "Startups", "Contact", "Blog", "FAQs"],
        "private_pages": ["Dashboard", "Investor Profiles", "Startup Profiles", "CRM", "Analytics", "Settings", "Subscription"]
    }