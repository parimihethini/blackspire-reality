"""Messaging API — conversations and messages between founders and investors."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_any_user
from app.db.session import get_db
from app.models.user import User
from app.services import messaging_service

router = APIRouter(prefix="/messaging", tags=["Messaging"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class StartConversationRequest(BaseModel):
    startup_id: int


class SendMessageRequest(BaseModel):
    body: str
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None


# ── Serializers ───────────────────────────────────────────────────────────────

def _serialize_user(u) -> dict:
    if not u:
        return {}
    return {"id": u.id, "name": u.name, "email": u.email, "profile_image": u.profile_image}


def _serialize_conv(c) -> dict:
    return {
        "id": c.id,
        "startup_id": c.startup_id,
        "startup_name": c.startup.name if c.startup else None,
        "startup_logo": c.startup.logo_url if c.startup else None,
        "investor": _serialize_user(c.investor),
        "founder": _serialize_user(c.founder),
        "subject": c.subject,
        "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def _serialize_msg(m) -> dict:
    return {
        "id": m.id,
        "conversation_id": m.conversation_id,
        "sender_id": m.sender_id,
        "sender": _serialize_user(m.sender) if hasattr(m, "sender") and m.sender else None,
        "body": m.body,
        "attachment_url": m.attachment_url,
        "attachment_name": m.attachment_name,
        "is_read": m.is_read,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


# ── Conversations ─────────────────────────────────────────────────────────────

@router.get("/conversations", summary="List my conversations")
async def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    convs = messaging_service.list_conversations(db, current_user)
    return [_serialize_conv(c) for c in convs]


@router.post("/conversations", status_code=status.HTTP_201_CREATED, summary="Start or retrieve a conversation")
async def start_conversation(
    body: StartConversationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    conv, created = messaging_service.get_or_create_conversation(
        db, startup_id=body.startup_id, investor=current_user
    )
    result = _serialize_conv(conv)
    result["created"] = created
    return result


@router.get("/conversations/{conversation_id}", summary="Get conversation detail")
async def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    conv = messaging_service.get_conversation(db, conversation_id, current_user)
    return _serialize_conv(conv)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Soft-delete a conversation")
async def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    messaging_service.soft_delete_conversation(db, conversation_id, current_user)
    return None


# ── Messages ──────────────────────────────────────────────────────────────────

@router.get("/conversations/{conversation_id}/messages", summary="List messages in a conversation")
async def list_messages(
    conversation_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    messages, total = messaging_service.list_messages(db, conversation_id, current_user, skip=skip, limit=limit)
    return {
        "items": [_serialize_msg(m) for m in messages],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("/conversations/{conversation_id}/messages", status_code=status.HTTP_201_CREATED, summary="Send a message")
async def send_message(
    conversation_id: int,
    body: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    msg = messaging_service.send_message(
        db,
        conversation_id=conversation_id,
        sender=current_user,
        body=body.body,
        attachment_url=body.attachment_url,
        attachment_name=body.attachment_name,
    )
    return _serialize_msg(msg)


@router.post("/conversations/{conversation_id}/read", summary="Mark messages in a conversation as read")
async def mark_read(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    count = messaging_service.mark_messages_read(db, conversation_id, current_user)
    return {"marked_read": count}
