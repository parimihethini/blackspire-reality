"""Communication models: notifications, conversations, messages."""
import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


# ── Notification ────────────────────────────────────────────────────────────────

class NotificationType(str, enum.Enum):
    startup_approved            = "startup_approved"
    startup_rejected            = "startup_rejected"
    investor_expressed_interest = "investor_expressed_interest"
    deck_request_received       = "deck_request_received"
    contact_request_received    = "contact_request_received"
    admin_action_performed      = "admin_action_performed"
    role_changed                = "role_changed"
    new_message_received        = "new_message_received"


class Notification(Base):
    __tablename__ = "notifications"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),    nullable=False, index=True)
    actor_id    = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"),   nullable=True)

    type        = Column(String(60),  nullable=False, index=True)
    title       = Column(String(255), nullable=False)
    body        = Column(Text,        nullable=True)
    link        = Column(String(500), nullable=True)

    entity_type = Column(String(50),  nullable=True)   # "startup" | "conversation" | "lead"
    entity_id   = Column(Integer,     nullable=True)

    is_read     = Column(Boolean, default=False, nullable=False, index=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user  = relationship("User", foreign_keys=[user_id],  back_populates="notifications")
    actor = relationship("User", foreign_keys=[actor_id])


# ── Conversation ─────────────────────────────────────────────────────────────────

class Conversation(Base):
    __tablename__ = "conversations"

    id               = Column(Integer, primary_key=True, index=True)
    startup_id       = Column(Integer, ForeignKey("startup_profiles.id", ondelete="SET NULL"), nullable=True,  index=True)
    investor_id      = Column(Integer, ForeignKey("users.id",            ondelete="CASCADE"),  nullable=False, index=True)
    founder_id       = Column(Integer, ForeignKey("users.id",            ondelete="CASCADE"),  nullable=False, index=True)

    subject          = Column(String(255), nullable=True)
    last_message_at  = Column(DateTime(timezone=True), nullable=True)

    investor_deleted = Column(Boolean, default=False, nullable=False)
    founder_deleted  = Column(Boolean, default=False, nullable=False)

    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    investor = relationship("User",           foreign_keys=[investor_id])
    founder  = relationship("User",           foreign_keys=[founder_id])
    startup  = relationship("StartupProfile", foreign_keys=[startup_id])
    messages = relationship("Message",        back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")

    __table_args__ = (
        UniqueConstraint("startup_id", "investor_id", name="uq_conversation_startup_investor"),
    )


# ── Message ───────────────────────────────────────────────────────────────────────

class Message(Base):
    __tablename__ = "messages"

    id              = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id       = Column(Integer, ForeignKey("users.id",         ondelete="CASCADE"), nullable=False, index=True)

    body            = Column(Text,        nullable=False)
    attachment_url  = Column(String(500), nullable=True)
    attachment_name = Column(String(255), nullable=True)

    is_read         = Column(Boolean, default=False, nullable=False)
    is_deleted      = Column(Boolean, default=False, nullable=False)

    created_at      = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender       = relationship("User",         foreign_keys=[sender_id])
