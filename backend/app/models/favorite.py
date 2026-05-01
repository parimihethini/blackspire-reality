from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    property_id = Column(Integer, ForeignKey("properties.id"), index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", backref="favorite_entries")
    property = relationship("Property", backref="favorited_by")

    # Constraints
    __table_args__ = (
        UniqueConstraint("user_id", "property_id", name="unique_user_property"),
    )
