from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.review import Review
from app.models.user import User
from app.models.property import Property
from app.schemas.review import ReviewCreate, ReviewResponse
from app.core.dependencies import get_current_user, get_any_user

router = APIRouter()

@router.post("/", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Allow customers/buyers to submit reviews, reject sellers
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == "seller":
        raise HTTPException(status_code=403, detail="Sellers cannot submit reviews.")
    
    # Check if property exists
    prop = db.query(Property).filter(Property.id == data.property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")

    # 3. Check for duplicates
    existing = db.query(Review).filter(
        Review.user_id == current_user.id,
        Review.property_id == data.property_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this property.")

    # 4. Create review
    new_review = Review(
        user_id=current_user.id,
        property_id=data.property_id,
        user_name=current_user.name,
        user_email=current_user.email,
        title=data.title,
        comment=data.comment,
        rating=data.rating
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review

@router.get("/", response_model=List[ReviewResponse])
def list_reviews(db: Session = Depends(get_db)):
    return db.query(Review).order_by(Review.created_at.desc()).all()

@router.get("/property/{property_id}", response_model=List[ReviewResponse])
def get_property_reviews(property_id: int, db: Session = Depends(get_db)):
    return db.query(Review).filter(Review.property_id == property_id).order_by(Review.created_at.desc()).all()

@router.get("/user/{email}", response_model=List[ReviewResponse])
def get_user_reviews(email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return db.query(Review).filter(Review.user_id == user.id).order_by(Review.created_at.desc()).all()

@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")
    
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    is_author = review.user_id == current_user.id
    is_admin = user_role == "admin"
    
    if not (is_author or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to delete this review.")
    
    db.delete(review)
    db.commit()
