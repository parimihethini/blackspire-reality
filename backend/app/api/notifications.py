"""Notifications API — full implementation replacing the push-subscribe stub."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_any_user, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services import notification_service

router = APIRouter()


# ── List notifications ────────────────────────────────────────────────────────

@router.get("/", summary="List my notifications")
async def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    notifications = notification_service.get_notifications(
        db, user_id=current_user.id, skip=skip, limit=limit, unread_only=unread_only
    )
    total = notification_service.get_total_count(db, current_user.id, unread_only=unread_only)
    return {
        "items": [_serialize(n) for n in notifications],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


# ── Unread count ──────────────────────────────────────────────────────────────

@router.get("/unread-count", summary="Get unread notification count")
async def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    count = notification_service.get_unread_count(db, current_user.id)
    return {"count": count}


# ── Mark single read ──────────────────────────────────────────────────────────

@router.post("/{notification_id}/read", summary="Mark a notification as read")
async def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    n = notification_service.mark_read(db, notification_id, current_user.id)
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    return _serialize(n)


# ── Mark all read ─────────────────────────────────────────────────────────────

@router.post("/read-all", summary="Mark all notifications as read")
async def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    count = notification_service.mark_all_read(db, current_user.id)
    return {"marked_read": count}


# ── Push subscribe (retained for PWA web-push) ────────────────────────────────

from pydantic import BaseModel
from app.services.push_service import set_subscription


class SubscribeRequest(BaseModel):
    subscription: dict


@router.post("/subscribe", summary="Subscribe to web-push notifications")
async def subscribe(
    payload: SubscribeRequest,
    current_user: User = Depends(get_any_user),
):
    if not payload.subscription:
        raise HTTPException(status_code=400, detail="Missing subscription")
    set_subscription(current_user.id, payload.subscription)
    return {"message": "Subscribed", "user_id": current_user.id}


# ── Serializer ────────────────────────────────────────────────────────────────

def _serialize(n) -> dict:
    return {
        "id": n.id,
        "type": n.type,
        "title": n.title,
        "body": n.body,
        "link": n.link,
        "entity_type": n.entity_type,
        "entity_id": n.entity_id,
        "is_read": n.is_read,
        "actor_id": n.actor_id,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }
