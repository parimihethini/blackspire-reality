import enum
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Text, JSON, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class StartupListingStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    draft = "draft"


class StartupVerificationStatus(str, enum.Enum):
    unverified = "unverified"
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class InterestLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    lead = "lead"


class InterestStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"
    withdrawn = "withdrawn"


class DeckRequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ContactRequestStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class StartupProfile(Base):
    __tablename__ = "startup_profiles"

    id = Column(Integer, primary_key=True, index=True)
    founder_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    startup_name = Column(String, nullable=False, index=True)
    logo = Column(String, nullable=True)
    founder_name = Column(String, nullable=False)
    industry = Column(String, index=True, nullable=False)
    stage = Column(String, index=True, nullable=False)
    revenue = Column(Float, default=0.0)
    team_size = Column(Integer, default=1)
    funding_requirement = Column(Float, nullable=False)
    pitch_deck_url = Column(String, nullable=True)
    website = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    tagline = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    listing_status = Column(
        Enum(StartupListingStatus, name="startuplistingstatus"),
        default=StartupListingStatus.pending,
        nullable=False,
    )
    verification_status = Column(
        Enum(StartupVerificationStatus, name="startupverificationstatus"),
        default=StartupVerificationStatus.unverified,
        nullable=False,
    )
    rejection_reason = Column(Text, nullable=True)
    metrics = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    founder = relationship("User", foreign_keys=[founder_id], back_populates="startup_profiles")


class StartupInterestExpression(Base):
    __tablename__ = "startup_interest_expressions"

    id = Column(Integer, primary_key=True, index=True)
    startup_id = Column(Integer, ForeignKey("startup_profiles.id"), nullable=False, index=True)
    investor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    interest_level = Column(String, default=InterestLevel.medium.value)
    message = Column(Text, nullable=True)
    investment_amount = Column(Float, nullable=True)
    status = Column(String, default=InterestStatus.pending.value)
    created_at = Column(DateTime, default=datetime.utcnow)


class StartupDeckRequest(Base):
    __tablename__ = "startup_deck_requests"

    id = Column(Integer, primary_key=True, index=True)
    startup_id = Column(Integer, ForeignKey("startup_profiles.id"), nullable=False, index=True)
    investor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    message = Column(Text, nullable=True)
    status = Column(String, default=DeckRequestStatus.pending.value)
    created_at = Column(DateTime, default=datetime.utcnow)


class StartupContactRequest(Base):
    __tablename__ = "startup_contact_requests"

    id = Column(Integer, primary_key=True, index=True)
    startup_id = Column(Integer, ForeignKey("startup_profiles.id"), nullable=False, index=True)
    investor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    message = Column(Text, nullable=True)
    status = Column(String, default=ContactRequestStatus.pending.value)
    created_at = Column(DateTime, default=datetime.utcnow)


class StartupSave(Base):
    __tablename__ = "startup_saves"

    id = Column(Integer, primary_key=True, index=True)
    startup_id = Column(Integer, ForeignKey("startup_profiles.id"), nullable=False, index=True)
    investor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


StartupModel = StartupProfile