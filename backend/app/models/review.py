from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.base import Base

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    
    user_name = Column(String(255), nullable=False)
    user_email = Column(String(255), nullable=False)
    
    title = Column(String(255), nullable=True)
    comment = Column(Text, nullable=False)
    rating = Column(Integer, nullable=False) # 1-5
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="reviews")
    property = relationship("Property", back_populates="reviews")
