"""Messaging service — conversations and messages between founders and investors."""
from __future__ import annotations

from typing import List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.communication import Conversation, Message
from app.models.startup import StartupProfile
from app.models.user import User, UserRole


def _role_str(role) -> str:
    return role.value if hasattr(role, "value") else str(role)


def _is_founder(user: User) -> bool:
    return _role_str(user.role) in ("startup_founder", "seller")


def _is_investor(user: User) -> bool:
    return _role_str(user.role) in ("investor", "customer")


def _assert_participant(conv: Conversation, user: User) -> None:
    """Raise 403 unless user is a party to the conversation."""
    if user.id not in (conv.investor_id, conv.founder_id):
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")


# ── Conversation helpers ──────────────────────────────────────────────────────

def get_or_create_conversation(
    db: Session,
    *,
    startup_id: int,
    investor: User,
    founder_id: Optional[int] = None,
) -> Tuple[Conversation, bool]:
    """Return (conversation, created).
    If a conversation already exists for this startup+investor pair, return it.
    Otherwise create a new one. founder_id is resolved from the startup if not supplied.
    """
    if not _is_investor(investor):
        raise HTTPException(status_code=403, detail="Only investors can initiate conversations")

    startup = db.query(StartupProfile).filter(StartupProfile.id == startup_id, StartupProfile.is_deleted == False).first()  # noqa: E712
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")

    resolved_founder_id = founder_id or startup.founder_id

    existing = (
        db.query(Conversation)
        .filter(
            Conversation.startup_id == startup_id,
            Conversation.investor_id == investor.id,
        )
        .first()
    )
    if existing:
        # Un-delete if previously soft-deleted by investor
        if existing.investor_deleted:
            existing.investor_deleted = False
            db.commit()
            db.refresh(existing)
        return existing, False

    conv = Conversation(
        startup_id=startup_id,
        investor_id=investor.id,
        founder_id=resolved_founder_id,
        subject=f"Conversation about {startup.name}",
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv, True


def list_conversations(db: Session, user: User) -> List[Conversation]:
    """List conversations visible to this user (not deleted by them)."""
    role = _role_str(user.role)
    if role in ("investor", "customer"):
        q = db.query(Conversation).filter(
            Conversation.investor_id == user.id,
            Conversation.investor_deleted == False,  # noqa: E712
        )
    elif role in ("startup_founder", "seller"):
        q = db.query(Conversation).filter(
            Conversation.founder_id == user.id,
            Conversation.founder_deleted == False,  # noqa: E712
        )
    elif role in ("admin", "super_admin", "team_member"):
        q = db.query(Conversation)
    else:
        return []

    return (
        q.options(
            joinedload(Conversation.startup),
            joinedload(Conversation.investor),
            joinedload(Conversation.founder),
        )
        .order_by(Conversation.last_message_at.desc().nullslast(), Conversation.created_at.desc())
        .all()
    )


def get_conversation(db: Session, conversation_id: int, user: User) -> Conversation:
    conv = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.startup),
            joinedload(Conversation.investor),
            joinedload(Conversation.founder),
        )
        .filter(Conversation.id == conversation_id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    role = _role_str(user.role)
    if role not in ("admin", "super_admin", "team_member"):
        _assert_participant(conv, user)
    return conv


# ── Message helpers ───────────────────────────────────────────────────────────

def list_messages(
    db: Session,
    conversation_id: int,
    user: User,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[Message], int]:
    """Return (messages, total) for a conversation."""
    conv = get_conversation(db, conversation_id, user)

    q = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id, Message.is_deleted == False)  # noqa: E712
    )
    total = q.count()
    messages = q.order_by(Message.created_at.asc()).offset(skip).limit(limit).all()
    return messages, total


def send_message(
    db: Session,
    conversation_id: int,
    sender: User,
    body: str,
    attachment_url: Optional[str] = None,
    attachment_name: Optional[str] = None,
) -> Message:
    conv = get_conversation(db, conversation_id, sender)
    _assert_participant(conv, sender)

    if not body.strip() and not attachment_url:
        raise HTTPException(status_code=400, detail="Message body or attachment required")

    msg = Message(
        conversation_id=conv.id,
        sender_id=sender.id,
        body=body.strip(),
        attachment_url=attachment_url,
        attachment_name=attachment_name,
    )
    db.add(msg)

    # Update last_message_at on conversation
    from sqlalchemy.sql import func as sqlfunc
    conv.last_message_at = sqlfunc.now()
    db.commit()
    db.refresh(msg)

    # Determine recipient and send notification
    recipient_id = conv.founder_id if sender.id == conv.investor_id else conv.investor_id
    from app.services import notification_service
    notification_service.notify_new_message(
        db,
        recipient_id=recipient_id,
        sender_name=sender.name or sender.email,
        conversation_id=conv.id,
        actor_id=sender.id,
    )

    return msg


def mark_messages_read(db: Session, conversation_id: int, user: User) -> int:
    """Mark all unread messages in a conversation as read for this user."""
    conv = get_conversation(db, conversation_id, user)
    _assert_participant(conv, user)

    updated = (
        db.query(Message)
        .filter(
            Message.conversation_id == conv.id,
            Message.sender_id != user.id,
            Message.is_read == False,  # noqa: E712
        )
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()
    return updated


def soft_delete_conversation(db: Session, conversation_id: int, user: User) -> None:
    conv = get_conversation(db, conversation_id, user)
    _assert_participant(conv, user)

    if user.id == conv.investor_id:
        conv.investor_deleted = True
    else:
        conv.founder_deleted = True
    db.commit()
