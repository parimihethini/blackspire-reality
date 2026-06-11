import csv
import io
import secrets
import string
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import String as SAString, cast, func, or_
from sqlalchemy.orm import Session

from app.core.constants import INVESTOR_SORT_FIELDS, INVESTOR_TYPES
from app.core.permissions import sync_user_role_assignment
from app.core.security import hash_password
from app.models.investor import Industry, InvestorProfile, Stage
from app.models.user import User, UserRole
from app.schemas.investor import InvestorProfileCreate, InvestorProfileUpdate


def resolve_industries(db: Session, industry_names: List[str]) -> List[Industry]:
    resolved = []
    for name in industry_names:
        name_clean = name.strip()
        if not name_clean:
            continue
        ind = db.query(Industry).filter(func.lower(Industry.name) == func.lower(name_clean)).first()
        if not ind:
            ind = Industry(name=name_clean)
            db.add(ind)
            db.flush()
        resolved.append(ind)
    return resolved


def resolve_stages(db: Session, stage_names: List[str]) -> List[Stage]:
    resolved = []
    for name in stage_names:
        name_clean = name.strip()
        if not name_clean:
            continue
        stg = db.query(Stage).filter(func.lower(Stage.name) == func.lower(name_clean)).first()
        if not stg:
            stg = Stage(name=name_clean)
            db.add(stg)
            db.flush()
        resolved.append(stg)
    return resolved


def _apply_list_filters(
    query,
    *,
    q: Optional[str],
    investor_type: Optional[str],
    stage: Optional[str],
    industry: Optional[str],
    city: Optional[str],
    country: Optional[str],
    ticket_size_min: Optional[float],
    ticket_size_max: Optional[float],
    priority_score: Optional[int],
):
    query = query.filter(InvestorProfile.is_deleted == False)

    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                User.name.ilike(search_term),
                User.email.ilike(search_term),
                InvestorProfile.company_name.ilike(search_term),
                InvestorProfile.designation.ilike(search_term),
                InvestorProfile.notes.ilike(search_term),
                InvestorProfile.internal_comments.ilike(search_term),
            )
        )

    if investor_type:
        query = query.filter(func.lower(InvestorProfile.investor_type) == investor_type.lower())

    if stage:
        query = query.filter(InvestorProfile.stages.any(func.lower(Stage.name) == stage.lower()))

    if industry:
        query = query.filter(InvestorProfile.industries.any(func.lower(Industry.name) == industry.lower()))

    if ticket_size_min is not None:
        query = query.filter(InvestorProfile.ticket_size_min >= ticket_size_min)
    if ticket_size_max is not None:
        query = query.filter(InvestorProfile.ticket_size_max <= ticket_size_max)

    if priority_score is not None:
        query = query.filter(InvestorProfile.priority_score == priority_score)

    if country:
        query = query.filter(cast(InvestorProfile.preferred_countries, SAString).ilike(f'%"{country}"%'))

    if city:
        query = query.filter(cast(InvestorProfile.preferred_cities, SAString).ilike(f'%"{city}"%'))

    return query


def _order_column(sort_by: str):
    if sort_by == "name":
        return User.name
    if sort_by == "email":
        return User.email
    if sort_by == "priority_score":
        return InvestorProfile.priority_score
    if sort_by == "company_name":
        return InvestorProfile.company_name
    return InvestorProfile.created_at


def list_investor_profiles(
    db: Session,
    *,
    q: Optional[str] = None,
    investor_type: Optional[str] = None,
    stage: Optional[str] = None,
    industry: Optional[str] = None,
    city: Optional[str] = None,
    country: Optional[str] = None,
    ticket_size_min: Optional[float] = None,
    ticket_size_max: Optional[float] = None,
    priority_score: Optional[int] = None,
    page: int = 1,
    per_page: int = 20,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> Tuple[List[InvestorProfile], int]:
    if sort_by not in INVESTOR_SORT_FIELDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"sort_by must be one of: {', '.join(INVESTOR_SORT_FIELDS)}",
        )

    base = db.query(InvestorProfile).join(User, InvestorProfile.user_id == User.id)
    filtered = _apply_list_filters(
        base,
        q=q,
        investor_type=investor_type,
        stage=stage,
        industry=industry,
        city=city,
        country=country,
        ticket_size_min=ticket_size_min,
        ticket_size_max=ticket_size_max,
        priority_score=priority_score,
    )

    total = filtered.count()
    order_col = _order_column(sort_by)
    ordered = filtered.order_by(order_col.asc() if sort_order.lower() == "asc" else order_col.desc())
    offset = (page - 1) * per_page
    items = ordered.offset(offset).limit(per_page).all()
    return items, total


def get_investor_profile(db: Session, profile_id: int) -> InvestorProfile:
    profile = db.query(InvestorProfile).filter(
        InvestorProfile.id == profile_id,
        InvestorProfile.is_deleted == False,
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Investor profile not found.")
    return profile


def _upgrade_user_to_investor(db: Session, user: User) -> None:
    user.role = UserRole.investor
    sync_user_role_assignment(db, user)
    db.flush()


def _restore_soft_deleted_profile(
    db: Session,
    profile: InvestorProfile,
    admin_id: int,
    body: InvestorProfileCreate,
) -> InvestorProfile:
    profile_data = body.model_dump(
        exclude={"user_id", "email", "name", "phone", "password", "industries", "stages"}
    )
    for key, val in profile_data.items():
        setattr(profile, key, val)

    profile.is_deleted = False
    profile.deleted_at = None
    profile.deleted_by = None
    profile.updated_by = admin_id
    profile.industries = resolve_industries(db, body.industries)
    profile.stages = resolve_stages(db, body.stages)

    db.commit()
    db.refresh(profile)
    return profile


def create_investor_profile(db: Session, body: InvestorProfileCreate, admin_id: int) -> InvestorProfile:
    if body.user_id:
        user = db.query(User).filter(User.id == body.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail=f"User with id {body.user_id} not found.")

        existing = db.query(InvestorProfile).filter(InvestorProfile.user_id == user.id).first()
        if existing and not existing.is_deleted:
            raise HTTPException(status_code=400, detail="User already has an active investor profile.")
        if existing and existing.is_deleted:
            _upgrade_user_to_investor(db, user)
            return _restore_soft_deleted_profile(db, existing, admin_id, body)
    else:
        if not body.email or not body.name:
            raise HTTPException(
                status_code=400,
                detail="Either user_id or both email and name must be provided.",
            )

        user = db.query(User).filter(func.lower(User.email) == func.lower(body.email)).first()
        if user:
            existing = db.query(InvestorProfile).filter(InvestorProfile.user_id == user.id).first()
            if existing and not existing.is_deleted:
                raise HTTPException(
                    status_code=400,
                    detail="User with this email already has an active investor profile.",
                )
            if existing and existing.is_deleted:
                _upgrade_user_to_investor(db, user)
                return _restore_soft_deleted_profile(db, existing, admin_id, body)
        else:
            pw = body.password or "".join(
                secrets.choice(string.ascii_letters + string.digits) for _ in range(12)
            )
            user = User(
                name=body.name,
                email=body.email.strip().lower(),
                phone=body.phone,
                hashed_password=hash_password(pw),
                role=UserRole.investor,
                is_verified=True,
                is_active=True,
            )
            db.add(user)
            db.flush()

    _upgrade_user_to_investor(db, user)

    inds = resolve_industries(db, body.industries)
    stgs = resolve_stages(db, body.stages)
    profile_data = body.model_dump(
        exclude={"user_id", "email", "name", "phone", "password", "industries", "stages"}
    )
    profile = InvestorProfile(
        user_id=user.id,
        created_by=admin_id,
        is_deleted=False,
        **profile_data,
    )
    profile.industries = inds
    profile.stages = stgs

    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def update_investor_profile(
    db: Session,
    profile_id: int,
    body: InvestorProfileUpdate,
    admin_id: int,
) -> InvestorProfile:
    profile = get_investor_profile(db, profile_id)
    profile.updated_by = admin_id

    data = body.model_dump(exclude_unset=True)
    if "industries" in data:
        profile.industries = resolve_industries(db, data.pop("industries"))
    if "stages" in data:
        profile.stages = resolve_stages(db, data.pop("stages"))

    for key, val in data.items():
        setattr(profile, key, val)

    db.commit()
    db.refresh(profile)
    return profile


def delete_investor_profile(db: Session, profile_id: int, admin_id: int) -> None:
    profile = get_investor_profile(db, profile_id)
    profile.is_deleted = True
    profile.deleted_at = datetime.now(timezone.utc)
    profile.deleted_by = admin_id
    db.commit()


def export_investors_csv(db: Session) -> bytes:
    profiles = db.query(InvestorProfile).filter(InvestorProfile.is_deleted == False).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Email", "Name", "Phone", "Company Name", "Designation", "Investor Type",
        "LinkedIn URL", "Website URL", "Ticket Size Min", "Ticket Size Max",
        "Preferred Countries", "Preferred Cities", "Industries", "Stages",
        "Notes", "Internal Comments", "Priority Score",
    ])
    for p in profiles:
        user = p.user
        writer.writerow([
            user.email,
            user.name,
            user.phone or "",
            p.company_name or "",
            p.designation or "",
            p.investor_type or "",
            p.linkedin_url or "",
            p.website_url or "",
            p.ticket_size_min if p.ticket_size_min is not None else "",
            p.ticket_size_max if p.ticket_size_max is not None else "",
            ",".join(p.preferred_countries or []),
            ",".join(p.preferred_cities or []),
            ",".join([ind.name for ind in p.industries]),
            ",".join([stg.name for stg in p.stages]),
            p.notes or "",
            p.internal_comments or "",
            p.priority_score or 0,
        ])
    return output.getvalue().encode("utf-8")


def import_investors_csv(db: Session, content: bytes, admin_id: int) -> dict:
    buffer = io.StringIO(content.decode("utf-8"))
    reader = csv.DictReader(buffer)

    imported_count = 0
    skipped_count = 0
    errors: List[str] = []

    for idx, row in enumerate(reader, start=1):
        email = (row.get("Email") or "").strip().lower()
        if not email:
            errors.append(f"Row {idx}: Missing Email field.")
            skipped_count += 1
            continue

        user = db.query(User).filter(func.lower(User.email) == email).first()
        if not user:
            errors.append(f"Row {idx}: User with email '{email}' does not exist. Skipping.")
            skipped_count += 1
            continue

        try:
            with db.begin_nested():
                if user.role != UserRole.investor:
                    user.role = UserRole.investor
                    sync_user_role_assignment(db, user)
                    db.flush()

                profile = db.query(InvestorProfile).filter(InvestorProfile.user_id == user.id).first()

                ticket_min = float(row.get("Ticket Size Min")) if row.get("Ticket Size Min") else None
                ticket_max = float(row.get("Ticket Size Max")) if row.get("Ticket Size Max") else None
                if ticket_min is not None and ticket_max is not None and ticket_min > ticket_max:
                    raise ValueError("Ticket Size Min cannot exceed Ticket Size Max.")

                inv_type = row.get("Investor Type") or None
                if inv_type and inv_type not in INVESTOR_TYPES:
                    raise ValueError(
                        f"Invalid Investor Type '{inv_type}'. Must be one of: {', '.join(INVESTOR_TYPES)}."
                    )

                countries = [c.strip() for c in (row.get("Preferred Countries") or "").split(",") if c.strip()]
                cities = [c.strip() for c in (row.get("Preferred Cities") or "").split(",") if c.strip()]
                industries_list = [i.strip() for i in (row.get("Industries") or "").split(",") if i.strip()]
                stages_list = [s.strip() for s in (row.get("Stages") or "").split(",") if s.strip()]
                priority = int(row.get("Priority Score") or 0)

                if profile:
                    profile.company_name = row.get("Company Name") or profile.company_name
                    profile.designation = row.get("Designation") or profile.designation
                    profile.investor_type = inv_type or profile.investor_type
                    profile.linkedin_url = row.get("LinkedIn URL") or profile.linkedin_url
                    profile.website_url = row.get("Website URL") or profile.website_url
                    profile.ticket_size_min = ticket_min if ticket_min is not None else profile.ticket_size_min
                    profile.ticket_size_max = ticket_max if ticket_max is not None else profile.ticket_size_max
                    profile.preferred_countries = countries if countries else profile.preferred_countries
                    profile.preferred_cities = cities if cities else profile.preferred_cities
                    profile.notes = row.get("Notes") or profile.notes
                    profile.internal_comments = row.get("Internal Comments") or profile.internal_comments
                    profile.priority_score = priority if "Priority Score" in row else profile.priority_score
                    profile.is_deleted = False
                    profile.deleted_at = None
                    profile.deleted_by = None
                    profile.updated_by = admin_id
                else:
                    profile = InvestorProfile(
                        user_id=user.id,
                        company_name=row.get("Company Name"),
                        designation=row.get("Designation"),
                        investor_type=inv_type,
                        linkedin_url=row.get("LinkedIn URL"),
                        website_url=row.get("Website URL"),
                        ticket_size_min=ticket_min,
                        ticket_size_max=ticket_max,
                        preferred_countries=countries,
                        preferred_cities=cities,
                        notes=row.get("Notes"),
                        internal_comments=row.get("Internal Comments"),
                        priority_score=priority,
                        created_by=admin_id,
                        is_deleted=False,
                    )
                    db.add(profile)
                    db.flush()

                if industries_list:
                    profile.industries = resolve_industries(db, industries_list)
                if stages_list:
                    profile.stages = resolve_stages(db, stages_list)

            imported_count += 1
        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")
            skipped_count += 1

    db.commit()
    return {
        "status": "success",
        "imported": imported_count,
        "skipped": skipped_count,
        "errors": errors,
    }
