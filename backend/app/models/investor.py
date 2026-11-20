from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Table, Text
from sqlalchemy.orm import relationship
from app.db.base import Base

investor_industries = Table(
    "investor_industries",
    Base.metadata,
    Column("investor_id", Integer, ForeignKey("investor_profiles.id"), primary_key=True),
    Column("industry_id", Integer, ForeignKey("industries.id"), primary_key=True),
    extend_existing=True,
)

investor_stages = Table(
    "investor_stages",
    Base.metadata,
    Column("investor_id", Integer, ForeignKey("investor_profiles.id"), primary_key=True),
    Column("stage_id", Integer, ForeignKey("stages.id"), primary_key=True),
    extend_existing=True,
)


class Industry(Base):
    __tablename__ = "industries"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)


class Stage(Base):
    __tablename__ = "stages"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)


class InvestorProfile(Base):
    __tablename__ = "investor_profiles"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True, index=True)
    investor_name = Column(String, nullable=True, index=True)
    company_name = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    investor_type = Column(String, nullable=True, index=True)
    profile_photo = Column(String, nullable=True)

    # Contact Details
    email = Column(String, unique=True, index=True, nullable=True)
    phone_number = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    website = Column(String, nullable=True)
    website_url = Column(String, nullable=True)

    # Investment Details
    investment_stage = Column(String, index=True, nullable=True)
    ticket_size_min = Column(Float, nullable=True)
    ticket_size_max = Column(Float, nullable=True)
    preferred_industries = Column(JSON, nullable=True)
    preferred_countries = Column(JSON, nullable=True)
    preferred_cities = Column(JSON, nullable=True)

    # Portfolio & Additional Data
    portfolio_investments = Column(JSON, nullable=True)
    exits = Column(JSON, nullable=True)
    unicorn_investments = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    internal_comments = Column(Text, nullable=True)
    priority_score = Column(Integer, default=0)

    is_deleted = Column(Boolean, default=False, nullable=False)
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], back_populates="investor_profile")
    industries = relationship("Industry", secondary=investor_industries)
    stages = relationship("Stage", secondary=investor_stages)


# Alias kept for backward compatibility
InvestorModel = InvestorProfile