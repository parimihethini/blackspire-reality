from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.startup import (
    ContactRequestStatus,
    DeckRequestStatus,
    InterestLevel,
    InterestStatus,
    StartupContactRequest,
    StartupDeckRequest,
    StartupInterestExpression,
    StartupListingStatus,
    StartupProfile,
    StartupSave,
)
from app.models.user import User
from app.schemas.startup import (
    ContactRequestCreate,
    DeckRequestCreate,
    InterestExpressionCreate,
    StartupInteractionSummary,
)
from app.services.startup_service import get_startup_profile


def _assert_published(profile: StartupProfile) -> None:
    if profile.status != StartupListingStatus.published:
        raise HTTPException(status_code=400, detail="Startup is not available for investor actions")


def save_startup(db: Session, startup_id: int, investor: User) -> dict:
    profile = get_startup_profile(db, startup_id)
    _assert_published(profile)

    existing = (
        db.query(StartupSave)
        .filter(StartupSave.investor_id == investor.id, StartupSave.startup_id == startup_id)
        .first()
    )
    if existing:
        return {"saved": True, "message": "Startup already saved"}

    save = StartupSave(investor_id=investor.id, startup_id=startup_id)
    db.add(save)
    db.commit()
    return {"saved": True, "message": "Startup saved"}


def unsave_startup(db: Session, startup_id: int, investor: User) -> dict:
    deleted = (
        db.query(StartupSave)
        .filter(StartupSave.investor_id == investor.id, StartupSave.startup_id == startup_id)
        .delete(synchronize_session=False)
    )
    db.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="Save not found")
    return {"saved": False, "message": "Startup unsaved"}


def list_saved_startups(db: Session, investor: User) -> List[StartupProfile]:
    saves = (
        db.query(StartupSave)
        .filter(StartupSave.investor_id == investor.id)
        .order_by(StartupSave.created_at.desc())
        .all()
    )
    if not saves:
        return []

    ids = [s.startup_id for s in saves]
    profiles = (
        db.query(StartupProfile)
        .options(joinedload(StartupProfile.industry), joinedload(StartupProfile.stage))
        .filter(
            StartupProfile.id.in_(ids),
            StartupProfile.is_deleted == False,
            StartupProfile.status == StartupListingStatus.published,
        )
        .all()
    )
    for p in profiles:
        p.is_saved = True
    return profiles


def request_pitch_deck(db: Session, startup_id: int, investor: User, body: DeckRequestCreate) -> StartupDeckRequest:
    profile = get_startup_profile(db, startup_id)
    _assert_published(profile)

    pending = (
        db.query(StartupDeckRequest)
        .filter(
            StartupDeckRequest.investor_id == investor.id,
            StartupDeckRequest.startup_id == startup_id,
            StartupDeckRequest.status == DeckRequestStatus.pending,
        )
        .first()
    )
    if pending:
        raise HTTPException(status_code=400, detail="You already have a pending deck request")

    req = StartupDeckRequest(
        investor_id=investor.id,
        startup_id=startup_id,
        message=body.message,
        status=DeckRequestStatus.pending,
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Notify founder
    try:
        from app.services import notification_service as ns
        ns.notify_deck_request(
            db,
            founder_id=profile.founder_id,
            investor_name=investor.name or investor.email,
            startup_name=profile.name,
            startup_id=startup_id,
            actor_id=investor.id,
        )
    except Exception as exc:
        print(f"[Notification] deck_request failed: {exc}")

    return req


def contact_founder(db: Session, startup_id: int, investor: User, body: ContactRequestCreate) -> StartupContactRequest:
    profile = get_startup_profile(db, startup_id)
    _assert_published(profile)

    req = StartupContactRequest(
        investor_id=investor.id,
        startup_id=startup_id,
        subject=body.subject,
        message=body.message,
        status=ContactRequestStatus.pending,
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Notify founder
    try:
        from app.services import notification_service as ns
        ns.notify_contact_request(
            db,
            founder_id=profile.founder_id,
            investor_name=investor.name or investor.email,
            startup_name=profile.name,
            startup_id=startup_id,
            actor_id=investor.id,
        )
    except Exception as exc:
        print(f"[Notification] contact_request failed: {exc}")

    return req


def express_interest(
    db: Session, startup_id: int, investor: User, body: InterestExpressionCreate
) -> StartupInterestExpression:
    profile = get_startup_profile(db, startup_id)
    _assert_published(profile)

    existing = (
        db.query(StartupInterestExpression)
        .filter(
            StartupInterestExpression.investor_id == investor.id,
            StartupInterestExpression.startup_id == startup_id,
        )
        .first()
    )
    if existing:
        existing.interest_level = InterestLevel(body.interest_level)
        existing.notes = body.notes
        existing.status = InterestStatus.active
        db.commit()
        db.refresh(existing)
        return existing

    expr = StartupInterestExpression(
        investor_id=investor.id,
        startup_id=startup_id,
        interest_level=InterestLevel(body.interest_level),
        notes=body.notes,
        status=InterestStatus.active,
    )
    db.add(expr)
    db.commit()
    db.refresh(expr)

    # Notify founder + auto-create CRM lead
    try:
        from app.services import notification_service as ns
        ns.notify_interest_expressed(
            db,
            founder_id=profile.founder_id,
            investor_name=investor.name or investor.email,
            startup_name=profile.name,
            startup_id=startup_id,
            actor_id=investor.id,
        )
    except Exception as exc:
        print(f"[Notification] interest_expressed failed: {exc}")

    try:
        from app.services import crm_service
        crm_service.auto_create_lead(
            db,
            startup_id=startup_id,
            investor_id=investor.id,
            founder_id=profile.founder_id,
            interest_level=body.interest_level,
            source="interest_expression",
        )
    except Exception as exc:
        print(f"[CRM] auto_create_lead failed: {exc}")

    return expr


def _val(v):
    return v.value if hasattr(v, "value") else v


def _serialize_interaction(row, startup_name: Optional[str] = None) -> dict:
    data = {
        "id": row.id,
        "startup_id": row.startup_id,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
    if startup_name:
        data["startup_name"] = startup_name
    if hasattr(row, "status"):
        data["status"] = _val(row.status)
    if hasattr(row, "message"):
        data["message"] = row.message
    if hasattr(row, "subject"):
        data["subject"] = row.subject
    if hasattr(row, "interest_level"):
        data["interest_level"] = _val(row.interest_level)
    if hasattr(row, "notes"):
        data["notes"] = row.notes
    return data


def get_investor_interactions(db: Session, investor: User) -> StartupInteractionSummary:
    deck_rows = (
        db.query(StartupDeckRequest, StartupProfile.name)
        .join(StartupProfile, StartupProfile.id == StartupDeckRequest.startup_id)
        .filter(StartupDeckRequest.investor_id == investor.id)
        .order_by(StartupDeckRequest.created_at.desc())
        .all()
    )
    contact_rows = (
        db.query(StartupContactRequest, StartupProfile.name)
        .join(StartupProfile, StartupProfile.id == StartupContactRequest.startup_id)
        .filter(StartupContactRequest.investor_id == investor.id)
        .order_by(StartupContactRequest.created_at.desc())
        .all()
    )
    interest_rows = (
        db.query(StartupInterestExpression, StartupProfile.name)
        .join(StartupProfile, StartupProfile.id == StartupInterestExpression.startup_id)
        .filter(StartupInterestExpression.investor_id == investor.id)
        .order_by(StartupInterestExpression.created_at.desc())
        .all()
    )
    saved = list_saved_startups(db, investor)

    return StartupInteractionSummary(
        deck_requests=[_serialize_interaction(r, name) for r, name in deck_rows],
        contact_requests=[_serialize_interaction(r, name) for r, name in contact_rows],
        interest_expressions=[_serialize_interaction(r, name) for r, name in interest_rows],
        saved_startups=[
            {"id": p.id, "name": p.name, "logo_url": p.logo_url, "status": _val(p.status)}
            for p in saved
        ],
    )
