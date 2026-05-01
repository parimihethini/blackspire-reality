from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.dependencies import get_any_user
from app.models.user import User
from app.services.push_service import set_subscription


router = APIRouter()


class SubscribeRequest(BaseModel):
    subscription: dict


@router.post("/subscribe")
async def subscribe(payload: SubscribeRequest, current_user: User = Depends(get_any_user)):
    if not payload.subscription:
        raise HTTPException(status_code=400, detail="Missing subscription")
    set_subscription(current_user.id, payload.subscription)
    return {"message": "Subscribed", "user_id": current_user.id}

