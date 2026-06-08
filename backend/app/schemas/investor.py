from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional
from datetime import datetime

class InvestorProfileBase(BaseModel):
    company_name: Optional[str] = None
    designation: Optional[str] = None
    investor_type: Optional[str] = None  # e.g. VC, Angel, PE, Family Office, Corporate, Other
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    ticket_size_min: Optional[float] = None
    ticket_size_max: Optional[float] = None
    preferred_countries: List[str] = []
    preferred_cities: List[str] = []
    notes: Optional[str] = None
    internal_comments: Optional[str] = None
    priority_score: int = 0
    industries: List[str] = []
    stages: List[str] = []

class InvestorProfileCreate(InvestorProfileBase):
    user_id: Optional[int] = None
    # User creation fields (if user_id is not specified)
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None

class InvestorProfileUpdate(InvestorProfileBase):
    pass

class UserSummary(BaseModel):
    id: int
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    is_active: bool = True

    model_config = {"from_attributes": True}

class InvestorProfileResponse(InvestorProfileBase):
    id: int
    user_id: int
    is_deleted: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    user: Optional[UserSummary] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None

    @field_validator("industries", mode="before")
    @classmethod
    def serialize_industries(cls, v):
        if not v:
            return []
        if isinstance(v, list) and len(v) > 0 and not isinstance(v[0], str):
            return [x.name for x in v]
        return v

    @field_validator("stages", mode="before")
    @classmethod
    def serialize_stages(cls, v):
        if not v:
            return []
        if isinstance(v, list) and len(v) > 0 and not isinstance(v[0], str):
            return [x.name for x in v]
        return v

    model_config = {"from_attributes": True}
