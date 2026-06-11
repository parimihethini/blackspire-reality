import enum

from sqlalchemy import (
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
from app.models.mixins import AuditSoftDeleteMixin


class StartupListingStatus(str, enum.Enum):
    draft = "draft"
    pending_review = "pending_review"
    published = "published"
    rejected = "rejected"
    suspended = "suspended"


class StartupVerificationStatus(str, enum.Enum):
    unverified = "unverified"
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class DeckRequestStatus(str, enum.Enum):
    pending = "pending"
    fulfilled = "fulfilled"
    declined = "declined"


class ContactRequestStatus(str, enum.Enum):
    pending = "pending"
    responded = "responded"
    closed = "closed"


class InterestLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class InterestStatus(str, enum.Enum):
    active = "active"
    withdrawn = "withdrawn"


class StartupProfile(AuditSoftDeleteMixin, Base):
    __tablename__ = "startup_profiles"

    id = Column(Integer, primary_key=True, index=True)
    founder_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(255), nullable=False, index=True)
    logo_url = Column(String(500), nullable=True)
    founder_name = Column(String(150), nullable=True)
    co_founder_name = Column(String(150), nullable=True)

    industry_id = Column(Integer, ForeignKey("industries.id", ondelete="SET NULL"), nullable=True, index=True)
    stage_id = Column(Integer, ForeignKey("stages.id", ondelete="SET NULL"), nullable=True, index=True)

    revenue = Column(Float, nullable=True)
    team_size = Column(Integer, nullable=True)
    funding_requirement = Column(Float, nullable=True)
    funding_raised = Column(Float, default=0.0)
    valuation = Column(Float, nullable=True)

    website = Column(String(255), nullable=True)
    linkedin_url = Column(String(255), nullable=True)

    description = Column(Text, nullable=True)
    problem_statement = Column(Text, nullable=True)
    solution = Column(Text, nullable=True)
    target_market = Column(Text, nullable=True)
    business_model = Column(Text, nullable=True)

    location = Column(String(255), nullable=True)
    country = Column(String(100), nullable=True, index=True)

    pitch_deck_url = Column(String(500), nullable=True)

    status = Column(
        String(50),
        default=StartupListingStatus.draft.value,
        nullable=False,
        index=True,
    )
    verification_status = Column(
        String(50),
        default=StartupVerificationStatus.unverified.value,
        nullable=False,
        index=True,
    )

    views_count = Column(Integer, default=0, nullable=False)
    profile_completion = Column(Integer, default=0, nullable=False)
    metadata_json = Column("metadata", JSON, default=dict)

    founder = relationship("User", foreign_keys=[founder_id], back_populates="startup_profiles")
    industry = relationship("Industry", foreign_keys=[industry_id])
    stage = relationship("Stage", foreign_keys=[stage_id])

    creator = relationship("User", foreign_keys="StartupProfile.created_by")
    updater = relationship("User", foreign_keys="StartupProfile.updated_by")
    deleter = relationship("User", foreign_keys="StartupProfile.deleted_by")

    saves = relationship("StartupSave", back_populates="startup", cascade="all, delete-orphan")
    deck_requests = relationship("StartupDeckRequest", back_populates="startup", cascade="all, delete-orphan")
    contact_requests = relationship("StartupContactRequest", back_populates="startup", cascade="all, delete-orphan")
    interest_expressions = relationship(
        "StartupInterestExpression", back_populates="startup", cascade="all, delete-orphan"
    )


class StartupSave(Base):
    __tablename__ = "startup_saves"

    id = Column(Integer, primary_key=True, index=True)
    investor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    startup_id = Column(Integer, ForeignKey("startup_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    investor = relationship("User", foreign_keys=[investor_id])
    startup = relationship("StartupProfile", back_populates="saves")

    __table_args__ = (
        UniqueConstraint("investor_id", "startup_id", name="uq_startup_save_investor_startup"),
    )


class StartupDeckRequest(Base):
    __tablename__ = "startup_deck_requests"

    id = Column(Integer, primary_key=True, index=True)
    investor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    startup_id = Column(Integer, ForeignKey("startup_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    message = Column(Text, nullable=True)
    status = Column(String(50), default=DeckRequestStatus.pending.value, nullable=False)
    metadata_json = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    investor = relationship("User", foreign_keys=[investor_id])
    startup = relationship("StartupProfile", back_populates="deck_requests")


class StartupContactRequest(Base):
    __tablename__ = "startup_contact_requests"

    id = Column(Integer, primary_key=True, index=True)
    investor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    startup_id = Column(Integer, ForeignKey("startup_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    subject = Column(String(255), nullable=True)
    message = Column(Text, nullable=False)
    status = Column(String(50), default=ContactRequestStatus.pending.value, nullable=False)
    metadata_json = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    investor = relationship("User", foreign_keys=[investor_id])
    startup = relationship("StartupProfile", back_populates="contact_requests")


class StartupInterestExpression(Base):
    __tablename__ = "startup_interest_expressions"

    id = Column(Integer, primary_key=True, index=True)
    investor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    startup_id = Column(Integer, ForeignKey("startup_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    interest_level = Column(String(20), default=InterestLevel.medium.value, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default=InterestStatus.active.value, nullable=False)
    metadata_json = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    investor = relationship("User", foreign_keys=[investor_id])
    startup = relationship("StartupProfile", back_populates="interest_expressions")

    __table_args__ = (
        UniqueConstraint("investor_id", "startup_id", name="uq_startup_interest_investor_startup"),
    )
