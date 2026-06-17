"""CRM models: leads, activity log, reminders."""
import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


# ── CRM Lead Status Enum ─────────────────────────────────────────────────────────

class CrmLeadStatus(str, enum.Enum):
    new_lead            = "new_lead"
    contacted           = "contacted"
    meeting_scheduled   = "meeting_scheduled"
    due_diligence       = "due_diligence"
    negotiation         = "negotiation"
    investment_confirmed = "investment_confirmed"
    rejected            = "rejected"
    archived            = "archived"


ACTIVE_CRM_STATUSES = {
    CrmLeadStatus.new_lead,
    CrmLeadStatus.contacted,
    CrmLeadStatus.meeting_scheduled,
    CrmLeadStatus.due_diligence,
    CrmLeadStatus.negotiation,
}


# ── CrmLead ───────────────────────────────────────────────────────────────────────

class CrmLead(Base):
    __tablename__ = "crm_leads"

    id               = Column(Integer, primary_key=True, index=True)
    startup_id       = Column(Integer, ForeignKey("startup_profiles.id", ondelete="CASCADE"),  nullable=False, index=True)
    investor_id      = Column(Integer, ForeignKey("users.id",            ondelete="CASCADE"),  nullable=False, index=True)
    founder_id       = Column(Integer, ForeignKey("users.id",            ondelete="CASCADE"),  nullable=False, index=True)

    status           = Column(String(50), default=CrmLeadStatus.new_lead.value, nullable=False, index=True)
    interest_level   = Column(String(20), nullable=True)
    estimated_value  = Column(Float,      nullable=True)
    notes            = Column(Text,       nullable=True)

    conversation_id  = Column(Integer, ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True)
    source           = Column(String(50), default="interest_expression", nullable=False)
    assigned_to      = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at       = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    startup      = relationship("StartupProfile", foreign_keys=[startup_id])
    investor     = relationship("User",           foreign_keys=[investor_id])
    founder      = relationship("User",           foreign_keys=[founder_id])
    assignee     = relationship("User",           foreign_keys=[assigned_to])
    conversation = relationship("Conversation",   foreign_keys=[conversation_id])
    activities   = relationship("CrmActivity",    back_populates="lead", cascade="all, delete-orphan", order_by="CrmActivity.created_at")
    reminders    = relationship("CrmReminder",    back_populates="lead", cascade="all, delete-orphan", order_by="CrmReminder.due_at")

    __table_args__ = (
        UniqueConstraint("startup_id", "investor_id", name="uq_crm_lead_startup_investor"),
    )


# ── CrmActivity ───────────────────────────────────────────────────────────────────

class CrmActivity(Base):
    __tablename__ = "crm_activities"

    id          = Column(Integer, primary_key=True, index=True)
    lead_id     = Column(Integer, ForeignKey("crm_leads.id", ondelete="CASCADE"),  nullable=False, index=True)
    actor_id    = Column(Integer, ForeignKey("users.id",     ondelete="SET NULL"),  nullable=True)

    action      = Column(String(100), nullable=False)   # "status_changed" | "note_added" | "reminder_set" | etc.
    from_status = Column(String(50),  nullable=True)
    to_status   = Column(String(50),  nullable=True)
    note        = Column(Text,        nullable=True)
    metadata_json = Column("metadata", JSON, default=dict)

    created_at  = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    lead  = relationship("CrmLead", back_populates="activities")
    actor = relationship("User",    foreign_keys=[actor_id])


# ── CrmReminder ───────────────────────────────────────────────────────────────────

class CrmReminder(Base):
    __tablename__ = "crm_reminders"

    id         = Column(Integer, primary_key=True, index=True)
    lead_id    = Column(Integer, ForeignKey("crm_leads.id", ondelete="CASCADE"),  nullable=False, index=True)
    owner_id   = Column(Integer, ForeignKey("users.id",     ondelete="CASCADE"),  nullable=False, index=True)

    title      = Column(String(255), nullable=False)
    due_at     = Column(DateTime(timezone=True), nullable=False, index=True)
    is_done    = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    lead  = relationship("CrmLead", back_populates="reminders")
    owner = relationship("User",    foreign_keys=[owner_id])
