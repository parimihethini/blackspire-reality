from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Investment(Base):
    __tablename__ = "investments"

    id = Column(Integer, primary_key=True, index=True)
    investor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)

    amount = Column(Float, nullable=False)
    equity_percentage = Column(Float, nullable=False)
    expected_roi = Column(Float, nullable=True)
    status = Column(String(50), default="active")
    notes = Column(Text, nullable=True)
    meta = Column(JSON, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    investor = relationship("User", back_populates="investments")
    property = relationship("Property", back_populates="investments")
