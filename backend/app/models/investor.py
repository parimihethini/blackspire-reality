from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

# Junction table for InvestorProfile <-> Industry
investor_industries = Table(
    "investor_industries",
    Base.metadata,
    Column("investor_profile_id", Integer, ForeignKey("investor_profiles.id", ondelete="CASCADE"), primary_key=True),
    Column("industry_id", Integer, ForeignKey("industries.id", ondelete="CASCADE"), primary_key=True),
)

# Junction table for InvestorProfile <-> Stage
investor_stages = Table(
    "investor_stages",
    Base.metadata,
    Column("investor_profile_id", Integer, ForeignKey("investor_profiles.id", ondelete="CASCADE"), primary_key=True),
    Column("stage_id", Integer, ForeignKey("stages.id", ondelete="CASCADE"), primary_key=True),
)


class Industry(Base):
    __tablename__ = "industries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)

    investor_profiles = relationship(
        "InvestorProfile", secondary=investor_industries, back_populates="industries"
    )


class Stage(Base):
    __tablename__ = "stages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)

    investor_profiles = relationship(
        "InvestorProfile", secondary=investor_stages, back_populates="stages"
    )


class InvestorProfile(Base):
    __tablename__ = "investor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    # Basic Info
    company_name = Column(String(255), nullable=True)
    designation = Column(String(100), nullable=True)
    investor_type = Column(String(50), nullable=True)  # Angel, VC, PE, Family Office, Corporate, Other

    # Contact & Links
    linkedin_url = Column(String(255), nullable=True)
    website_url = Column(String(255), nullable=True)

    # Investment Preferences
    ticket_size_min = Column(Float, nullable=True)
    ticket_size_max = Column(Float, nullable=True)
    preferred_countries = Column(JSON, default=list)  # JSON list of strings
    preferred_cities = Column(JSON, default=list)     # JSON list of strings

    # Admin Info & Additional
    notes = Column(Text, nullable=True)
    internal_comments = Column(Text, nullable=True)
    priority_score = Column(Integer, default=0)

    # Soft Delete
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="investor_profile")
    industries = relationship("Industry", secondary=investor_industries, back_populates="investor_profiles")
    stages = relationship("Stage", secondary=investor_stages, back_populates="investor_profiles")

    # Audit relation helpers (optional, but clean for loading who did what)
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])
    deleter = relationship("User", foreign_keys=[deleted_by])
