from datetime import datetime, timezone
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.constants import STARTUP_PROFILE_FIELDS, STARTUP_SORT_FIELDS
from app.models.investor import Industry, Stage
from app.models.startup import (
    InterestStatus,
    StartupContactRequest,
    StartupDeckRequest,
    StartupInterestExpression,
    StartupListingStatus,
    StartupProfile,
    StartupSave,
    StartupVerificationStatus,
)
from app.models.user import User
from app.schemas.startup import FounderDashboardResponse, StartupProfileCreate, StartupProfileUpdate


def _role_str(role) -> str:
    return role.value if hasattr(role, "value") else str(role)


def resolve_industry(db: Session, name: Optional[str]) -> Optional[Industry]:
    if not name or not name.strip():
        return None
    clean = name.strip()
    ind = db.query(Industry).filter(func.lower(Industry.name) == func.lower(clean)).first()
    if not ind:
        ind = Industry(name=clean)
        db.add(ind)
        db.flush()
    return ind


def resolve_stage(db: Session, name: Optional[str]) -> Optional[Stage]:
    if not name or not name.strip():
        return None
    clean = name.strip()
    stg = db.query(Stage).filter(func.lower(Stage.name) == func.lower(clean)).first()
    if not stg:
        stg = Stage(name=clean)
        db.add(stg)
        db.flush()
    return stg


def compute_profile_completion(profile: StartupProfile) -> int:
    score = 0
    for field_name, weight in STARTUP_PROFILE_FIELDS:
        val = getattr(profile, field_name, None)
        if field_name == "industry_id":
            val = profile.industry_id
        elif field_name == "stage_id":
            val = profile.stage_id
        if val is not None and val != "" and val != 0:
            score += weight
    if profile.pitch_deck_url:
        score = min(100, score + 10)
    return min(100, score)


def _apply_profile_fields(profile: StartupProfile, data: dict, db: Session) -> None:
    industry_name = data.pop("industry", None)
    stage_name = data.pop("stage", None)

    if industry_name is not None:
        profile.industry = resolve_industry(db, industry_name)
    if stage_name is not None:
        profile.stage = resolve_stage(db, stage_name)

    for key, value in data.items():
        if hasattr(profile, key):
            setattr(profile, key, value)


def _base_query(db: Session, *, include_deleted: bool = False):
    query = db.query(StartupProfile).options(
        joinedload(StartupProfile.industry),
        joinedload(StartupProfile.stage),
    )
    if not include_deleted:
        query = query.filter(StartupProfile.is_deleted == False)
    return query


def get_startup_profile(
    db: Session,
    startup_id: int,
    *,
    include_deleted: bool = False,
) -> StartupProfile:
    query = _base_query(db, include_deleted=include_deleted)
    profile = query.filter(StartupProfile.id == startup_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Startup not found")
    return profile


def assert_founder_owns(profile: StartupProfile, user: User) -> None:
    if profile.founder_id != user.id:
        raise HTTPException(status_code=403, detail="You do not own this startup")


def create_startup_profile(db: Session, body: StartupProfileCreate, founder: User) -> StartupProfile:
    data = body.model_dump()
    profile = StartupProfile(
        founder_id=founder.id,
        founder_name=data.get("founder_name") or founder.name,
        created_by=founder.id,
        status=StartupListingStatus.draft,
        verification_status=StartupVerificationStatus.unverified,
    )
    _apply_profile_fields(profile, data, db)
    profile.profile_completion = compute_profile_completion(profile)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return get_startup_profile(db, profile.id)


def update_startup_profile(
    db: Session,
    startup_id: int,
    body: StartupProfileUpdate,
    actor: User,
    *,
    is_admin: bool = False,
) -> StartupProfile:
    profile = get_startup_profile(db, startup_id)
    if not is_admin:
        assert_founder_owns(profile, actor)

    data = body.model_dump(exclude_unset=True)

    if not is_admin:
        data.pop("status", None)
        data.pop("verification_status", None)
        if profile.status == StartupListingStatus.published:
            raise HTTPException(
                status_code=400,
                detail="Published startups cannot be edited directly. Contact admin to suspend first.",
            )

    status_val = data.pop("status", None)
    verification_val = data.pop("verification_status", None)

    _apply_profile_fields(profile, data, db)

    if is_admin and status_val:
        profile.status = StartupListingStatus(status_val)
    if is_admin and verification_val:
        profile.verification_status = StartupVerificationStatus(verification_val)

    profile.updated_by = actor.id
    profile.profile_completion = compute_profile_completion(profile)
    db.commit()
    return get_startup_profile(db, startup_id)


def delete_startup_profile(db: Session, startup_id: int, actor: User, *, is_admin: bool = False) -> None:
    profile = get_startup_profile(db, startup_id)
    if not is_admin:
        assert_founder_owns(profile, actor)
    profile.is_deleted = True
    profile.deleted_at = datetime.now(timezone.utc)
    profile.deleted_by = actor.id
    db.commit()


def submit_startup_for_review(db: Session, startup_id: int, founder: User) -> StartupProfile:
    profile = get_startup_profile(db, startup_id)
    assert_founder_owns(profile, founder)

    if profile.status not in (StartupListingStatus.draft, StartupListingStatus.rejected):
        raise HTTPException(status_code=400, detail="Only draft or rejected startups can be submitted")

    completion = compute_profile_completion(profile)
    if completion < 50:
        raise HTTPException(
            status_code=422,
            detail=f"Profile must be at least 50% complete to submit (currently {completion}%)",
        )

    profile.status = StartupListingStatus.pending_review
    profile.updated_by = founder.id
    db.commit()
    return get_startup_profile(db, startup_id)


def _apply_list_filters(
    query,
    *,
    q: Optional[str],
    industry: Optional[str],
    stage: Optional[str],
    country: Optional[str],
    funding_min: Optional[float],
    funding_max: Optional[float],
    revenue_min: Optional[float],
    revenue_max: Optional[float],
    team_size_min: Optional[int],
    team_size_max: Optional[int],
    status: Optional[str],
    verification_status: Optional[str],
    founder_id: Optional[int],
    published_only: bool = False,
):
    if published_only:
        query = query.filter(StartupProfile.status == StartupListingStatus.published)
    elif status:
        query = query.filter(StartupProfile.status == StartupListingStatus(status))

    if verification_status:
        query = query.filter(
            StartupProfile.verification_status == StartupVerificationStatus(verification_status)
        )

    if founder_id is not None:
        query = query.filter(StartupProfile.founder_id == founder_id)

    if q:
        term = f"%{q}%"
        query = query.filter(
            or_(
                StartupProfile.name.ilike(term),
                StartupProfile.founder_name.ilike(term),
                StartupProfile.co_founder_name.ilike(term),
                StartupProfile.description.ilike(term),
                StartupProfile.problem_statement.ilike(term),
                StartupProfile.solution.ilike(term),
                StartupProfile.target_market.ilike(term),
                StartupProfile.business_model.ilike(term),
                StartupProfile.location.ilike(term),
                StartupProfile.country.ilike(term),
            )
        )

    if industry:
        query = query.filter(
            StartupProfile.industry.has(func.lower(Industry.name) == industry.lower())
        )

    if stage:
        query = query.filter(StartupProfile.stage.has(func.lower(Stage.name) == stage.lower()))

    if country:
        query = query.filter(func.lower(StartupProfile.country) == country.lower())

    if funding_min is not None:
        query = query.filter(StartupProfile.funding_requirement >= funding_min)
    if funding_max is not None:
        query = query.filter(StartupProfile.funding_requirement <= funding_max)
    if revenue_min is not None:
        query = query.filter(StartupProfile.revenue >= revenue_min)
    if revenue_max is not None:
        query = query.filter(StartupProfile.revenue <= revenue_max)
    if team_size_min is not None:
        query = query.filter(StartupProfile.team_size >= team_size_min)
    if team_size_max is not None:
        query = query.filter(StartupProfile.team_size <= team_size_max)

    return query


def _order_column(sort_by: str):
    mapping = {
        "name": StartupProfile.name,
        "funding_requirement": StartupProfile.funding_requirement,
        "revenue": StartupProfile.revenue,
        "team_size": StartupProfile.team_size,
        "views_count": StartupProfile.views_count,
        "profile_completion": StartupProfile.profile_completion,
    }
    return mapping.get(sort_by, StartupProfile.created_at)


def list_startup_profiles(
    db: Session,
    *,
    q: Optional[str] = None,
    industry: Optional[str] = None,
    stage: Optional[str] = None,
    country: Optional[str] = None,
    funding_min: Optional[float] = None,
    funding_max: Optional[float] = None,
    revenue_min: Optional[float] = None,
    revenue_max: Optional[float] = None,
    team_size_min: Optional[int] = None,
    team_size_max: Optional[int] = None,
    status: Optional[str] = None,
    verification_status: Optional[str] = None,
    founder_id: Optional[int] = None,
    published_only: bool = False,
    page: int = 1,
    per_page: int = 20,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> Tuple[List[StartupProfile], int]:
    if sort_by not in STARTUP_SORT_FIELDS:
        raise HTTPException(status_code=422, detail=f"Invalid sort_by. Allowed: {', '.join(STARTUP_SORT_FIELDS)}")

    query = _base_query(db)
    query = _apply_list_filters(
        query,
        q=q,
        industry=industry,
        stage=stage,
        country=country,
        funding_min=funding_min,
        funding_max=funding_max,
        revenue_min=revenue_min,
        revenue_max=revenue_max,
        team_size_min=team_size_min,
        team_size_max=team_size_max,
        status=status,
        verification_status=verification_status,
        founder_id=founder_id,
        published_only=published_only,
    )

    total = query.count()
    col = _order_column(sort_by)
    query = query.order_by(col.desc() if sort_order.lower() == "desc" else col.asc())
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return items, total


def get_public_startup(db: Session, startup_id: int, viewer_id: Optional[int] = None) -> StartupProfile:
    profile = get_startup_profile(db, startup_id)
    if profile.status != StartupListingStatus.published:
        raise HTTPException(status_code=404, detail="Startup not found")
    profile.views_count = (profile.views_count or 0) + 1
    db.commit()
    profile = get_startup_profile(db, startup_id)
    if viewer_id:
        saved = (
            db.query(StartupSave)
            .filter(StartupSave.investor_id == viewer_id, StartupSave.startup_id == startup_id)
            .first()
        )
        profile.is_saved = bool(saved)
    return profile


def approve_startup(db: Session, startup_id: int, admin: User) -> StartupProfile:
    profile = get_startup_profile(db, startup_id)
    if profile.status != StartupListingStatus.pending_review:
        raise HTTPException(status_code=400, detail="Only pending_review startups can be approved")
    profile.status = StartupListingStatus.published
    profile.updated_by = admin.id
    db.commit()
    return get_startup_profile(db, startup_id)


def reject_startup(db: Session, startup_id: int, admin: User, reason: Optional[str] = None) -> StartupProfile:
    profile = get_startup_profile(db, startup_id)
    profile.status = StartupListingStatus.rejected
    profile.updated_by = admin.id
    if reason:
        meta = profile.metadata_json or {}
        meta["rejection_reason"] = reason
        profile.metadata_json = meta
    db.commit()
    return get_startup_profile(db, startup_id)


def verify_startup(db: Session, startup_id: int, admin: User) -> StartupProfile:
    profile = get_startup_profile(db, startup_id)
    profile.verification_status = StartupVerificationStatus.verified
    profile.updated_by = admin.id
    db.commit()
    return get_startup_profile(db, startup_id)


def suspend_startup(db: Session, startup_id: int, admin: User, reason: Optional[str] = None) -> StartupProfile:
    profile = get_startup_profile(db, startup_id)
    profile.status = StartupListingStatus.suspended
    profile.updated_by = admin.id
    if reason:
        meta = profile.metadata_json or {}
        meta["suspension_reason"] = reason
        profile.metadata_json = meta
    db.commit()
    return get_startup_profile(db, startup_id)


def get_founder_dashboard(db: Session, founder: User) -> FounderDashboardResponse:
    profiles = (
        db.query(StartupProfile)
        .filter(StartupProfile.founder_id == founder.id, StartupProfile.is_deleted == False)
        .all()
    )
    startup_ids = [p.id for p in profiles]

    deck_count = contact_count = interest_count = saves_count = 0
    if startup_ids:
        deck_count = (
            db.query(StartupDeckRequest)
            .filter(StartupDeckRequest.startup_id.in_(startup_ids))
            .count()
        )
        contact_count = (
            db.query(StartupContactRequest)
            .filter(StartupContactRequest.startup_id.in_(startup_ids))
            .count()
        )
        interest_count = (
            db.query(StartupInterestExpression)
            .filter(
                StartupInterestExpression.startup_id.in_(startup_ids),
                StartupInterestExpression.status == InterestStatus.active,
            )
            .count()
        )
        saves_count = db.query(StartupSave).filter(StartupSave.startup_id.in_(startup_ids)).count()

    total_views = sum(p.views_count or 0 for p in profiles)
    avg_completion = (
        round(sum(p.profile_completion or 0 for p in profiles) / len(profiles))
        if profiles
        else 0
    )
    funding_raised = sum(p.funding_raised or 0 for p in profiles)
    funding_requirement = sum(p.funding_requirement or 0 for p in profiles)

    return FounderDashboardResponse(
        total_startups=len(profiles),
        published_startups=sum(1 for p in profiles if p.status == StartupListingStatus.published),
        pending_review_startups=sum(1 for p in profiles if p.status == StartupListingStatus.pending_review),
        total_views=total_views,
        deck_requests=deck_count,
        contact_requests=contact_count,
        interest_expressions=interest_count,
        saves_count=saves_count,
        profile_completion=avg_completion,
        funding_raised=funding_raised,
        funding_requirement=funding_requirement,
    )


def list_founder_startups(db: Session, founder: User) -> List[StartupProfile]:
    return (
        _base_query(db)
        .filter(StartupProfile.founder_id == founder.id)
        .order_by(StartupProfile.created_at.desc())
        .all()
    )
