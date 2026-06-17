"""Notification service — create, read, push events."""
from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.models.communication import Notification, NotificationType
from app.models.user import User


# ── WebSocket push registry ────────────────────────────────────────────────────
# Maps user_id → set of live WebSocket connections for that user.
_ws_connections: Dict[int, Set[WebSocket]] = {}


def register_ws(user_id: int, ws: WebSocket) -> None:
    _ws_connections.setdefault(user_id, set()).add(ws)


def unregister_ws(user_id: int, ws: WebSocket) -> None:
    _ws_connections.get(user_id, set()).discard(ws)


async def push_notification(user_id: int, payload: dict) -> None:
    """Broadcast a JSON payload to all open sockets for a user (fire-and-forget)."""
    dead: Set[WebSocket] = set()
    for ws in list(_ws_connections.get(user_id, set())):
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            dead.add(ws)
    _ws_connections.get(user_id, set()).difference_update(dead)


# ── Core notification factory ──────────────────────────────────────────────────

def create_notification(
    db: Session,
    *,
    user_id: int,
    type: NotificationType,
    title: str,
    body: str | None = None,
    link: str | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    actor_id: int | None = None,
) -> Notification:
    """Persist a notification row and return it (WS push happens separately)."""
    n = Notification(
        user_id=user_id,
        actor_id=actor_id,
        type=type.value,
        title=title,
        body=body,
        link=link,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


def _enqueue_push(user_id: int, notification: Notification) -> None:
    """Schedule a WS push on the running event loop (non-blocking)."""
    payload = {
        "type": "notification",
        "id": notification.id,
        "notification_type": notification.type,
        "title": notification.title,
        "body": notification.body,
        "link": notification.link,
        "entity_type": notification.entity_type,
        "entity_id": notification.entity_id,
        "is_read": False,
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
    }
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(push_notification(user_id, payload))
    except RuntimeError:
        pass  # No event loop — skip push (background / test contexts)


def notify(
    db: Session,
    *,
    user_id: int,
    type: NotificationType,
    title: str,
    body: str | None = None,
    link: str | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    actor_id: int | None = None,
) -> None:
    """Create a notification and push via WebSocket (convenience wrapper)."""
    n = create_notification(
        db,
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        link=link,
        entity_type=entity_type,
        entity_id=entity_id,
        actor_id=actor_id,
    )
    _enqueue_push(user_id, n)


# ── Read / mark operations ─────────────────────────────────────────────────────

def get_notifications(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
) -> List[Notification]:
    q = db.query(Notification).filter(Notification.user_id == user_id)
    if unread_only:
        q = q.filter(Notification.is_read == False)  # noqa: E712
    return q.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()


def get_total_count(db: Session, user_id: int, unread_only: bool = False) -> int:
    q = db.query(Notification).filter(Notification.user_id == user_id)
    if unread_only:
        q = q.filter(Notification.is_read == False)  # noqa: E712
    return q.count()


def get_unread_count(db: Session, user_id: int) -> int:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
        .count()
    )


def mark_read(db: Session, notification_id: int, user_id: int) -> Notification | None:
    n = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if n:
        n.is_read = True
        db.commit()
        db.refresh(n)
    return n


def mark_all_read(db: Session, user_id: int) -> int:
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()
    return updated


# ── Event helpers (called from other services) ─────────────────────────────────

def notify_startup_approved(db: Session, founder_id: int, startup_name: str, startup_id: int, actor_id: int) -> None:
    notify(
        db, user_id=founder_id, actor_id=actor_id,
        type=NotificationType.startup_approved,
        title=f"🎉 Your startup '{startup_name}' has been approved!",
        body="Your startup is now live on the marketplace.",
        link=f"/startups/{startup_id}",
        entity_type="startup", entity_id=startup_id,
    )


def notify_startup_rejected(db: Session, founder_id: int, startup_name: str, startup_id: int, actor_id: int, reason: str | None = None) -> None:
    notify(
        db, user_id=founder_id, actor_id=actor_id,
        type=NotificationType.startup_rejected,
        title=f"Your startup '{startup_name}' was not approved",
        body=reason or "Please review and resubmit your startup listing.",
        link=f"/founder/dashboard",
        entity_type="startup", entity_id=startup_id,
    )


def notify_interest_expressed(db: Session, founder_id: int, investor_name: str, startup_name: str, startup_id: int, actor_id: int) -> None:
    notify(
        db, user_id=founder_id, actor_id=actor_id,
        type=NotificationType.investor_expressed_interest,
        title=f"💡 {investor_name} expressed interest in '{startup_name}'",
        body="An investor wants to connect with you. Open your CRM to follow up.",
        link=f"/founder/crm",
        entity_type="startup", entity_id=startup_id,
    )


def notify_deck_request(db: Session, founder_id: int, investor_name: str, startup_name: str, startup_id: int, actor_id: int) -> None:
    notify(
        db, user_id=founder_id, actor_id=actor_id,
        type=NotificationType.deck_request_received,
        title=f"📄 {investor_name} requested your pitch deck for '{startup_name}'",
        body="Review and respond to this deck request in your dashboard.",
        link=f"/founder/dashboard",
        entity_type="startup", entity_id=startup_id,
    )


def notify_contact_request(db: Session, founder_id: int, investor_name: str, startup_name: str, startup_id: int, actor_id: int) -> None:
    notify(
        db, user_id=founder_id, actor_id=actor_id,
        type=NotificationType.contact_request_received,
        title=f"✉️ {investor_name} sent a contact request about '{startup_name}'",
        body="An investor wants to reach you. Check your messages.",
        link=f"/messaging",
        entity_type="startup", entity_id=startup_id,
    )


def notify_role_changed(db: Session, target_user_id: int, new_role: str, actor_id: int) -> None:
    notify(
        db, user_id=target_user_id, actor_id=actor_id,
        type=NotificationType.role_changed,
        title=f"Your account role has been updated to '{new_role}'",
        body="Please log in again to refresh your session.",
        link="/",
    )


def notify_new_message(db: Session, recipient_id: int, sender_name: str, conversation_id: int, actor_id: int) -> None:
    notify(
        db, user_id=recipient_id, actor_id=actor_id,
        type=NotificationType.new_message_received,
        title=f"💬 New message from {sender_name}",
        body="You have a new message. Click to read it.",
        link=f"/messaging/{conversation_id}",
        entity_type="conversation", entity_id=conversation_id,
    )
