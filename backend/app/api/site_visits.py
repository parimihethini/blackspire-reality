from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.property import Property, SiteVisit
from app.schemas.property import SiteVisitCreate, SiteVisitResponse

router = APIRouter()

@router.post("/", response_model=SiteVisitResponse)
def create_site_visit(
    data: SiteVisitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print("[DEBUG] current_user:", current_user)
    print("[DEBUG] role:", current_user.role)
    # Check if property exists
    prop = db.query(Property).filter(Property.id == data.property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Check if already requested (existing check)
    existing = db.query(SiteVisit).filter(
        SiteVisit.customer_id == current_user.id,
        SiteVisit.property_id == data.property_id,
        SiteVisit.status == "pending"
    ).first()
    
    if existing:
        return existing

    # Use data from request or defaults
    site_visit = SiteVisit(
        customer_id=current_user.id,
        property_id=data.property_id,
        name=data.name or current_user.name,
        email=data.email or current_user.email,
        phone=data.phone or current_user.phone,
        requested_date=data.requested_date or datetime.now().strftime("%Y-%m-%d"),
        time=data.time or "TBD",
        message=data.message or "Requesting a site visit.",
        status="pending"
    )
    db.add(site_visit)
    db.commit()
    db.refresh(site_visit)
    return site_visit

@router.get("/", response_model=List[SiteVisitResponse])
def list_site_visits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"[DEBUG] list_site_visits: user={current_user.id} role={current_user.role}")
    # Return site visits where the user is the customer
    return db.query(SiteVisit).filter(SiteVisit.customer_id == current_user.id).all()
