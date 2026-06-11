import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SAEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class UserRole(str, enum.Enum):
    # ── Legacy roles (kept for backward compatibility with existing DB rows) ──
    customer = "customer"
    seller = "seller"

    # ── Core admin roles ──
    admin = "admin"
    super_admin = "super_admin"   # Full platform control, cannot be self-deleted
    team_member = "team_member"   # Internal Blackspire staff (read + limited write)

    # ── Phase 1 domain roles ──
    startup_founder = "startup_founder"  # Can create/manage startup profiles
    investor = "investor"                # Can browse startups, view matches


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    hashed_password = Column(String(255), nullable=True)
    role = Column(SAEnum(UserRole), nullable=False)
    profile_image = Column(String(500), nullable=True)

    # OAuth provider linkage (Phase 1)
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    linkedin_id = Column(String(255), unique=True, nullable=True, index=True)
    auth_provider = Column(String(50), nullable=True, default="email")

    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    verification_token = Column(String(255), nullable=True)
    otp_code = Column(String(10), nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)

    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    reset_otp_hash = Column(String(255), nullable=True)
    reset_otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    reset_otp_attempts = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    properties = relationship("Property", back_populates="seller", lazy="select")
    investments = relationship("Investment", back_populates="investor", lazy="select")
    site_visits = relationship("SiteVisit", back_populates="customer", lazy="select")
    reviews = relationship("Review", back_populates="user", lazy="select")
    notifications = relationship("Notification", back_populates="user", lazy="select")
    investor_profile = relationship("InvestorProfile", uselist=False, back_populates="user", cascade="all, delete-orphan", foreign_keys="[InvestorProfile.user_id]")
    startup_profiles = relationship("StartupProfile", back_populates="founder", lazy="select", foreign_keys="[StartupProfile.founder_id]")
