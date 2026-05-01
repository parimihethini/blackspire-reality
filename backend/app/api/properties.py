from typing import List, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import get_current_seller, get_current_customer, get_any_user
from app.models.property import Property, SiteVisit, Notification
from app.models.user import User
from app.services.push_service import get_subscription, send_push
from app.schemas.property import (
    PropertyCreate, PropertyUpdate, PropertyResponse,
    SiteVisitCreate, SiteVisitResponse, SiteVisitStatusUpdate,
)
from app.services.geocoding_service import geocode
from app.services.search_service import search
from app.services.cache_service import cache
from app.ai.price_predictor import predict_price
from app.ai.fraud_detection import detect_fraud

router = APIRouter()
_ai_executor = ThreadPoolExecutor(max_workers=2)


async def _geocode_and_enrich(data: dict, prop: Property):
    """Auto-geocode if coordinates are missing."""
    if not prop.latitude or not prop.longitude:
        coords = await geocode(
            street=prop.street, area=prop.area,
            city=prop.city, state=prop.state,
            country=prop.country, pincode=prop.pincode,
        )
        if coords:
            prop.latitude, prop.longitude = coords


async def _run_ai(prop: Property, db: Session):
    """Run price prediction and fraud detection in a thread executor (non-blocking)."""
    input_data = {
        "price": prop.price, "size": prop.size, "type": prop.type.value if prop.type else "house",
        "city": prop.city, "state": prop.state, "approval": prop.approval.value if prop.approval else "Approved",
        "bedrooms": prop.bedrooms, "bathrooms": prop.bathrooms,
    }
    loop = asyncio.get_event_loop()
    try:
        price_result = await loop.run_in_executor(_ai_executor, predict_price, input_data)
        prop.price_prediction = price_result["predicted_price"]
    except Exception as e:
        print(f"[AI] Price prediction error: {e}")

    try:
        fraud_result = await loop.run_in_executor(_ai_executor, detect_fraud, input_data)
        prop.fraud_score = fraud_result["risk_score"]
    except Exception as e:
        print(f"[AI] Fraud detection error: {e}")


# ── Public endpoints ──────────────────────────────────────────────────────────

@router.get("/", response_model=List[PropertyResponse])
async def list_properties(
    q: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    pincode: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    cache_key = f"properties:{q}:{city}:{type}:{min_price}:{max_price}:{pincode}:{page}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    # Try Elasticsearch first
    es_result = await search.search(
        query=q, city=city, prop_type=type,
        min_price=min_price, max_price=max_price, pincode=pincode,
        from_=(page - 1) * per_page, size=per_page,
    )
    hits = es_result["hits"]["hits"]

    if hits:
        ids = [int(h["_id"]) for h in hits]
        props = db.query(Property).filter(Property.id.in_(ids)).all()
        id_order = {pid: i for i, pid in enumerate(ids)}
        props = sorted(props, key=lambda p: id_order.get(p.id, 999))
    else:
        # Fallback: PostgreSQL query
        q_obj = db.query(Property).filter(Property.is_published == True)
        if city:
            q_obj = q_obj.filter(Property.city.ilike(f"%{city}%"))
        if type:
            q_obj = q_obj.filter(Property.type == type)
        if min_price:
            q_obj = q_obj.filter(Property.price >= min_price)
        if max_price:
            q_obj = q_obj.filter(Property.price <= max_price)
        if pincode:
            q_obj = q_obj.filter(Property.pincode == pincode)
        if q:
            q_obj = q_obj.filter(
                Property.title.ilike(f"%{q}%") | Property.description.ilike(f"%{q}%")
            )
        props = q_obj.offset((page - 1) * per_page).limit(per_page).all()

    result = [PropertyResponse.model_validate(p).model_dump() for p in props]
    await cache.set(cache_key, result, ttl=120)
    return result


# ── Seller endpoints (MUST be before /{property_id} to avoid route conflicts) ─


@router.post("/", response_model=PropertyResponse, status_code=201)
async def create_property(
    property: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_seller),
):
    print(f"[PROPERTIES] Create property request for user {current_user.email}")
    data = property.model_dump()
    data.pop("seller_email", None) # Remove it if present to avoid conflict
    new_property = Property(**data)
    new_property.seller_id = current_user.id
    new_property.seller_email = current_user.email

    db.add(new_property)
    db.commit()
    db.refresh(new_property)
    
    # Optional: trigger background tasks for geo/ai if needed, but the core task is saving to DB
    return new_property


@router.get("/seller/my", response_model=List[PropertyResponse])
async def my_properties(
    db: Session = Depends(get_db),
    seller: User = Depends(get_current_seller),
):
    """Get properties owned by the authenticated seller.
    IMPORTANT: This route MUST be defined before GET /{property_id}
    to prevent FastAPI from matching 'seller' as an integer property_id.
    """
    return db.query(Property).filter(Property.seller_id == seller.id).all()


# ── Site Visits (MUST be before /{property_id}) ───────────────────────────────

@router.post("/visit/request", response_model=SiteVisitResponse, status_code=201)
async def request_visit(
    data: SiteVisitCreate,
    db: Session = Depends(get_db),
    customer: User = Depends(get_current_customer),
):
    prop = db.query(Property).filter(Property.id == data.property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    prop.leads = (prop.leads or 0) + 1
    visit = SiteVisit(
        property_id=data.property_id,
        customer_id=customer.id,
        requested_date=data.requested_date,
        message=data.message,
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit


@router.get("/visit/seller", response_model=List[SiteVisitResponse])
async def seller_visits(
    db: Session = Depends(get_db),
    seller: User = Depends(get_current_seller),
):
    prop_ids = [p.id for p in db.query(Property).filter(Property.seller_id == seller.id).all()]
    return db.query(SiteVisit).filter(SiteVisit.property_id.in_(prop_ids)).all()


@router.patch("/visit/{visit_id}/status", response_model=SiteVisitResponse)
async def update_visit_status(
    visit_id: int,
    payload: SiteVisitStatusUpdate,
    db: Session = Depends(get_db),
    seller: User = Depends(get_current_seller),
):
    normalized_status = (payload.status or "").strip().lower()
    if normalized_status not in {"approved", "declined"}:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'declined'")

    visit = db.query(SiteVisit).filter(SiteVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit request not found")

    prop = db.query(Property).filter(Property.id == visit.property_id).first()
    if not prop or prop.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Not allowed to update this visit request")

    visit.status = normalized_status

    message = (
        "Your property visit has been approved"
        if normalized_status == "approved"
        else "Your property visit has been declined"
    )
    db.add(
        Notification(
            user_id=visit.customer_id,
            message=message,
            is_read=False,
        )
    )
    db.commit()
    db.refresh(visit)

    # Best-effort web push notification (if user subscribed).
    sub = get_subscription(visit.customer_id)
    if sub:
        send_push(sub, "Blackspire Reality", message)
    return visit


@router.get("/notifications")
async def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return rows


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    row = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found")
    row.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}


# ── Dynamic property route (MUST be last to avoid swallowing static paths) ────

@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(property_id: int, db: Session = Depends(get_db)):
    cached = await cache.get(f"property:{property_id}")
    if cached:
        return cached

    prop = db.query(Property).filter(
        Property.id == property_id, Property.is_published == True
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    prop.views = (prop.views or 0) + 1
    db.commit()
    db.refresh(prop)

    result = PropertyResponse.model_validate(prop).model_dump()
    await cache.set(f"property:{property_id}", result, ttl=300)
    return result


@router.put("/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: int,
    data: PropertyUpdate,
    db: Session = Depends(get_db),
    seller: User = Depends(get_current_seller),
):
    prop = db.query(Property).filter(
        Property.id == property_id, Property.seller_id == seller.id
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found or not yours")

    location_changed = any(
        data.model_dump(exclude_unset=True).get(f)
        for f in ["street", "area", "city", "state", "pincode"]
    )

    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(prop, key, val)

    if location_changed:
        await _geocode_and_enrich(data.model_dump(), prop)

    await _run_ai(prop, db)
    db.commit()
    db.refresh(prop)
    await cache.delete_pattern("properties:*")
    await cache.delete(f"property:{property_id}")
    await search.index({
        "id": prop.id, "title": prop.title, "price": prop.price,
        "city": prop.city, "pincode": prop.pincode, "is_published": prop.is_published,
    })
    return prop


@router.delete("/{property_id}")
async def delete_property(
    property_id: int,
    db: Session = Depends(get_db),
    seller: User = Depends(get_current_seller),
):
    prop = db.query(Property).filter(
        Property.id == property_id, Property.seller_id == seller.id
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found or not yours")
    db.delete(prop)
    db.commit()
    await cache.delete_pattern("properties:*")
    await search.delete(property_id)
    return {"message": "Property deleted"}
