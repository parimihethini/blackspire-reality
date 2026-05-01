from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.schemas.property import PropertyResponse

class FavoriteBase(BaseModel):
    property_id: int

class FavoriteCreate(FavoriteBase):
    pass

class FavoriteResponse(FavoriteBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class FavoriteWithPropertyResponse(FavoriteResponse):
    property: PropertyResponse
