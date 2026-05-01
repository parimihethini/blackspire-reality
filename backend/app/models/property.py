import enum
import builtins
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, JSON, Enum as SAEnum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class PropertyType(str, enum.Enum):
    plot = "plot"
    house = "house"
    villa = "villa"
    apartment = "apartment"
    commercial = "commercial"
    investment = "investment"
    # Extended types from frontend form
    studio = "studio"
    penthouse = "penthouse"
    duplex = "duplex"
    agricultural = "agricultural"
    farm = "farm"
    office = "office"
    shop = "shop"
    building = "building"
    warehouse = "warehouse"
    industrial = "industrial"
    coworking = "coworking"
    coliving = "coliving"
    resort = "resort"


class PropertyStatus(str, enum.Enum):
    available = "Available"
    sold = "Sold"
    ready_to_move = "Ready to Move"
    under_construction = "Under Construction"
    new_launch = "New Launch"
    under_negotiation = "Under Negotiation"


class ApprovalType(str, enum.Enum):
    dtcp = "DTCP"
    cmda = "CMDA"
    bmrda = "BMRDA"
    approved = "Approved"
    panchayat = "Panchayat"


class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(SAEnum(PropertyType), nullable=False)
    status = Column(SAEnum(PropertyStatus), default=PropertyStatus.available)
    approval = Column(SAEnum(ApprovalType), default=ApprovalType.approved)

    price = Column(Float, nullable=False)
    size = Column(String(100), nullable=True)
    bedrooms = Column(Integer, nullable=True)
    bathrooms = Column(Integer, nullable=True)

    # Location
    street = Column(String(300), nullable=True)
    area = Column(String(200), nullable=True)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    country = Column(String(100), default="India")
    pincode = Column(String(10), nullable=False, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    map_url = Column(String(1000), nullable=True)

    # Media & metadata
    images = Column(JSON, default=list)
    documents = Column(JSON, default=list)
    features = Column(JSON, default=list)

    seller_phone = Column(String(20), nullable=True)
    seller_email = Column(String(255), nullable=True)

    is_verified = Column(Boolean, default=False)
    is_published = Column(Boolean, default=True)
    views = Column(Integer, default=0)
    leads = Column(Integer, default=0)

    # AI fields
    price_prediction = Column(Float, nullable=True)
    fraud_score = Column(Float, nullable=True)
    investment_score = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    seller = relationship("User", back_populates="properties")
    site_visits = relationship("SiteVisit", back_populates="property", lazy="select")
    investments = relationship("Investment", back_populates="property", lazy="select")
    reviews = relationship("Review", back_populates="property", lazy="select")


class SiteVisit(Base):
    __tablename__ = "site_visits"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(150), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    requested_date = Column(String(50), nullable=False)
    time = Column(String(20), nullable=True)
    message = Column(Text, nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    property = relationship("Property", back_populates="site_visits")
    customer = relationship("User", back_populates="site_visits")

    @builtins.property
    def customer_name(self) -> str | None:
        return self.name or (self.customer.name if self.customer is not None else None)

    @builtins.property
    def customer_email(self) -> str | None:
        return self.email or (self.customer.email if self.customer is not None else None)

    @builtins.property
    def customer_phone(self) -> str | None:
        return self.phone or (self.customer.phone if self.customer is not None else None)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")
