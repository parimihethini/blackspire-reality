from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, field_validator

from app.core.constants import (
    INTEREST_LEVELS,
    STARTUP_LISTING_STATUSES,
    STARTUP_VERIFICATION_STATUSES,
)


class StartupProfileBase(BaseModel):
    name: str
    logo_url: Optional[str] = None
    founder_name: Optional[str] = None
    co_founder_name: Optional[str] = None
    industry: Optional[str] = None
    stage: Optional[str] = None
    revenue: Optional[float] = None
    team_size: Optional[int] = None
    funding_requirement: Optional[float] = None
    funding_raised: Optional[float] = 0
    valuation: Optional[float] = None
    website: Optional[str] = None
    linkedin_url: Optional[str] = None
    description: Optional[str] = None
    problem_statement: Optional[str] = None
    solution: Optional[str] = None
    target_market: Optional[str] = None
    business_model: Optional[str] = None
    location: Optional[str] = None
    country: Optional[str] = None
    pitch_deck_url: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("name must be at least 2 characters")
        return v

    @field_validator("team_size")
    @classmethod
    def validate_team_size(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 1:
            raise ValueError("team_size must be at least 1")
        return v

    @field_validator("funding_raised", "funding_requirement", "revenue", "valuation")
    @classmethod
    def validate_non_negative(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("monetary values cannot be negative")
        return v


class StartupProfileCreate(StartupProfileBase):
    pass


class StartupProfileUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    founder_name: Optional[str] = None
    co_founder_name: Optional[str] = None
    industry: Optional[str] = None
    stage: Optional[str] = None
    revenue: Optional[float] = None
    team_size: Optional[int] = None
    funding_requirement: Optional[float] = None
    funding_raised: Optional[float] = None
    valuation: Optional[float] = None
    website: Optional[str] = None
    linkedin_url: Optional[str] = None
    description: Optional[str] = None
    problem_statement: Optional[str] = None
    solution: Optional[str] = None
    target_market: Optional[str] = None
    business_model: Optional[str] = None
    location: Optional[str] = None
    country: Optional[str] = None
    pitch_deck_url: Optional[str] = None
    status: Optional[str] = None
    verification_status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in STARTUP_LISTING_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(STARTUP_LISTING_STATUSES)}")
        return v

    @field_validator("verification_status")
    @classmethod
    def validate_verification_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in STARTUP_VERIFICATION_STATUSES:
            raise ValueError(f"verification_status must be one of: {', '.join(STARTUP_VERIFICATION_STATUSES)}")
        return v


class StartupProfileResponse(StartupProfileBase):
    id: int
    founder_id: int
    status: str
    verification_status: str
    views_count: int = 0
    profile_completion: int = 0
    is_deleted: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    is_saved: Optional[bool] = None

    @field_validator("status", mode="before")
    @classmethod
    def serialize_status(cls, v):
        return v.value if hasattr(v, "value") else v

    @field_validator("verification_status", mode="before")
    @classmethod
    def serialize_verification_status(cls, v):
        return v.value if hasattr(v, "value") else v

    @field_validator("industry", mode="before")
    @classmethod
    def serialize_industry(cls, v):
        if v is None:
            return None
        if hasattr(v, "name"):
            return v.name
        return v

    @field_validator("stage", mode="before")
    @classmethod
    def serialize_stage(cls, v):
        if v is None:
            return None
        if hasattr(v, "name"):
            return v.name
        return v

    model_config = {"from_attributes": True}


class FounderDashboardResponse(BaseModel):
    total_startups: int
    published_startups: int
    pending_review_startups: int
    total_views: int
    deck_requests: int
    contact_requests: int
    interest_expressions: int
    saves_count: int
    profile_completion: int
    funding_raised: float
    funding_requirement: float


class DeckRequestCreate(BaseModel):
    message: Optional[str] = None


class ContactRequestCreate(BaseModel):
    subject: Optional[str] = None
    message: str

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 10:
            raise ValueError("message must be at least 10 characters")
        return v


class InterestExpressionCreate(BaseModel):
    interest_level: str = "medium"
    notes: Optional[str] = None

    @field_validator("interest_level")
    @classmethod
    def validate_interest_level(cls, v: str) -> str:
        if v not in INTEREST_LEVELS:
            raise ValueError(f"interest_level must be one of: {', '.join(INTEREST_LEVELS)}")
        return v


class StartupInteractionSummary(BaseModel):
    deck_requests: List[dict] = []
    contact_requests: List[dict] = []
    interest_expressions: List[dict] = []
    saved_startups: List[dict] = []


class ModerationAction(BaseModel):
    reason: Optional[str] = None
