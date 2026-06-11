from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, JSON, Boolean, Table
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.mixins import AuditSoftDeleteMixin

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


class InvestorProfile(AuditSoftDeleteMixin, Base):
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

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="investor_profile")
    industries = relationship("Industry", secondary=investor_industries, back_populates="investor_profiles")
    stages = relationship("Stage", secondary=investor_stages, back_populates="investor_profiles")

    creator = relationship("User", foreign_keys="InvestorProfile.created_by")
    updater = relationship("User", foreign_keys="InvestorProfile.updated_by")
    deleter = relationship("User", foreign_keys="InvestorProfile.deleted_by")
