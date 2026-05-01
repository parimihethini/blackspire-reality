from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.property import PropertyType, PropertyStatus, ApprovalType


class PropertyCreate(BaseModel):
    title: str
    description: Optional[str] = None
    type: PropertyType
    status: PropertyStatus = PropertyStatus.available
    approval: ApprovalType = ApprovalType.approved
    price: float
    size: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    street: Optional[str] = None
    area: Optional[str] = None
    city: str
    state: str
    country: str = "India"
    pincode: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    map_url: Optional[str] = None
    images: Optional[List[str]] = []
    features: Optional[List[str]] = []
    seller_phone: Optional[str] = None
    seller_email: Optional[str] = None

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 4:
            raise ValueError("Valid pincode is required")
        return v

    @field_validator("price")
    @classmethod
    def validate_price(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Price must be positive")
        return v


class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[PropertyType] = None
    status: Optional[PropertyStatus] = None
    approval: Optional[ApprovalType] = None
    price: Optional[float] = None
    size: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    street: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    map_url: Optional[str] = None
    images: Optional[List[str]] = None
    features: Optional[List[str]] = None
    seller_phone: Optional[str] = None
    is_published: Optional[bool] = None


class AdminPropertyApprove(BaseModel):
    """Admin moderation: approve (publish + verify) or reject (unpublish)."""

    approved: bool = True


class PropertyResponse(BaseModel):
    id: int
    seller_id: int
    title: str
    description: Optional[str]
    type: PropertyType
    status: PropertyStatus
    approval: ApprovalType
    price: float
    size: Optional[str]
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    street: Optional[str]
    area: Optional[str]
    city: str
    state: str
    country: str
    pincode: str
    latitude: Optional[float]
    longitude: Optional[float]
    map_url: Optional[str]
    images: Optional[List[str]]
    features: Optional[List[str]]
    seller_phone: Optional[str]
    seller_email: Optional[str]
    views: int
    leads: int
    price_prediction: Optional[float]
    investment_score: Optional[float]
    fraud_score: Optional[float]
    is_verified: bool
    is_published: bool
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class SiteVisitCreate(BaseModel):
    property_id: int
    requested_date: str
    message: Optional[str] = None


class SiteVisitResponse(BaseModel):
    id: int
    property_id: int
    customer_id: int
    requested_date: str
    message: Optional[str]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SiteVisitStatusUpdate(BaseModel):
    status: str
