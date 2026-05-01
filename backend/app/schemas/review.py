from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

class ReviewBase(BaseModel):
    property_id: int
    title: Optional[str] = None
    comment: str = Field(..., min_length=10)
    rating: int = Field(..., ge=1, le=5)

class ReviewCreate(ReviewBase):
    pass

class ReviewResponse(ReviewBase):
    id: int
    user_id: int
    user_name: str
    user_email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True
