import csv
import io
import secrets
import string
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.investor import InvestorProfile, Industry, Stage
from app.core.dependencies import get_current_admin_user
from app.core.permissions import sync_user_role_assignment
from app.core.security import hash_password
from app.schemas.investor import (
    InvestorProfileCreate,
    InvestorProfileUpdate,
    InvestorProfileResponse,
)

router = APIRouter(prefix="/admin/investors", tags=["Investor Management"])


def _resolve_industries(db: Session, industry_names: List[str]) -> List[Industry]:
    resolved = []
    for name in industry_names:
        name_clean = name.strip()
        if not name_clean:
            continue
        # Case-insensitive query
        ind = db.query(Industry).filter(func.lower(Industry.name) == func.lower(name_clean)).first()
        if not ind:
            ind = Industry(name=name_clean)
            db.add(ind)
            db.flush()
        resolved.append(ind)
    return resolved


def _resolve_stages(db: Session, stage_names: List[str]) -> List[Stage]:
    resolved = []
    for name in stage_names:
        name_clean = name.strip()
        if not name_clean:
            continue
        # Case-insensitive query
        stg = db.query(Stage).filter(func.lower(Stage.name) == func.lower(name_clean)).first()
        if not stg:
            stg = Stage(name=name_clean)
            db.add(stg)
            db.flush()
        resolved.append(stg)
    return resolved


@router.post("/", response_model=InvestorProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_investor_profile(
    body: InvestorProfileCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    if body.user_id:
        user = db.query(User).filter(User.id == body.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail=f"User with id {body.user_id} not found.")

        # Check if user already has a profile (not soft deleted)
        existing = db.query(InvestorProfile).filter(
            InvestorProfile.user_id == user.id,
            InvestorProfile.is_deleted == False
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="User already has an active investor profile.")
    else:
        if not body.email or not body.name:
            raise HTTPException(
                status_code=400,
                detail="Either user_id or both email and name must be provided."
            )

        # Check if email is already taken
        user = db.query(User).filter(func.lower(User.email) == func.lower(body.email)).first()
        if user:
            existing = db.query(InvestorProfile).filter(
                InvestorProfile.user_id == user.id,
                InvestorProfile.is_deleted == False
            ).first()
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="User with this email already has an active investor profile."
                )
        else:
            # Generate random secure password if not provided
            pw = body.password or "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
            user = User(
                name=body.name,
                email=body.email.strip().lower(),
                phone=body.phone,
                hashed_password=hash_password(pw),
                role=UserRole.investor,
                is_verified=True,
                is_active=True
            )
            db.add(user)
            db.flush()

    # Align user role in DB and sync assignment
    user.role = UserRole.investor
    sync_user_role_assignment(db, user)
    db.flush()

    # Resolve industries and stages
    inds = _resolve_industries(db, body.industries)
    stgs = _resolve_stages(db, body.stages)

    # Map fields
    profile_data = body.model_dump(
        exclude={"user_id", "email", "name", "phone", "password", "industries", "stages"}
    )
    profile = InvestorProfile(
        user_id=user.id,
        created_by=admin.id,
        is_deleted=False,
        **profile_data
    )
    profile.industries = inds
    profile.stages = stgs

    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/", response_model=List[InvestorProfileResponse])
async def list_investor_profiles(
    q: Optional[str] = Query(None),
    investor_type: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    ticket_size_min: Optional[float] = Query(None),
    ticket_size_max: Optional[float] = Query(None),
    priority_score: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    query = db.query(InvestorProfile).join(User, InvestorProfile.user_id == User.id)
    # Exclude soft deleted profiles
    query = query.filter(InvestorProfile.is_deleted == False)

    # Search keyword
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                User.name.ilike(search_term),
                User.email.ilike(search_term),
                InvestorProfile.company_name.ilike(search_term),
                InvestorProfile.designation.ilike(search_term)
            )
        )

    # Filters
    if investor_type:
        query = query.filter(InvestorProfile.investor_type == investor_type)

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
        from sqlalchemy import String as SAString
        from sqlalchemy.sql.expression import cast
        query = query.filter(cast(InvestorProfile.preferred_countries, SAString).ilike(f'%"{country}"%'))

    if city:
        from sqlalchemy import String as SAString
        from sqlalchemy.sql.expression import cast
        query = query.filter(cast(InvestorProfile.preferred_cities, SAString).ilike(f'%"{city}"%'))

    # Sorting
    direction = sort_order.lower()
    order_col = None
    if sort_by == "name":
        order_col = User.name
    elif sort_by == "email":
        order_col = User.email
    elif sort_by == "priority_score":
        order_col = InvestorProfile.priority_score
    elif sort_by == "company_name":
        order_col = InvestorProfile.company_name
    else:
        order_col = InvestorProfile.created_at

    if direction == "asc":
        query = query.order_by(order_col.asc())
    else:
        query = query.order_by(order_col.desc())

    # Pagination
    offset = (page - 1) * per_page
    return query.offset(offset).limit(per_page).all()


@router.get("/export")
async def export_investors_csv(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    profiles = db.query(InvestorProfile).filter(InvestorProfile.is_deleted == False).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Email", "Name", "Phone", "Company Name", "Designation", "Investor Type",
        "LinkedIn URL", "Website URL", "Ticket Size Min", "Ticket Size Max",
        "Preferred Countries", "Preferred Cities", "Industries", "Stages",
        "Notes", "Internal Comments", "Priority Score"
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
            p.priority_score or 0
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=investors_export.csv"}
    )


@router.post("/import")
async def import_investors_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")

    contents = await file.read()
    buffer = io.StringIO(contents.decode("utf-8"))
    reader = csv.DictReader(buffer)

    imported_count = 0
    skipped_count = 0
    errors = []

    for idx, row in enumerate(reader, start=1):
        email = (row.get("Email") or "").strip().lower()
        if not email:
            errors.append(f"Row {idx}: Missing Email field.")
            skipped_count += 1
            continue

        # Check if user exists in the database
        user = db.query(User).filter(func.lower(User.email) == email).first()
        if not user:
            # Approved plan modification: Do not automatically create user accounts during CSV import.
            errors.append(f"Row {idx}: User with email '{email}' does not exist. Skipping.")
            skipped_count += 1
            continue

        try:
            # Upgrade user role if not already investor
            if user.role != UserRole.investor:
                user.role = UserRole.investor
                sync_user_role_assignment(db, user)
                db.flush()

            # Get profile if it exists (active or deleted)
            profile = db.query(InvestorProfile).filter(InvestorProfile.user_id == user.id).first()

            ticket_min = float(row.get("Ticket Size Min")) if row.get("Ticket Size Min") else None
            ticket_max = float(row.get("Ticket Size Max")) if row.get("Ticket Size Max") else None

            countries = [c.strip() for c in (row.get("Preferred Countries") or "").split(",") if c.strip()]
            cities = [c.strip() for c in (row.get("Preferred Cities") or "").split(",") if c.strip()]

            industries_list = [i.strip() for i in (row.get("Industries") or "").split(",") if i.strip()]
            stages_list = [s.strip() for s in (row.get("Stages") or "").split(",") if s.strip()]

            priority = int(row.get("Priority Score") or 0)

            if profile:
                profile.company_name = row.get("Company Name") or profile.company_name
                profile.designation = row.get("Designation") or profile.designation
                profile.investor_type = row.get("Investor Type") or profile.investor_type
                profile.linkedin_url = row.get("LinkedIn URL") or profile.linkedin_url
                profile.website_url = row.get("Website URL") or profile.website_url
                profile.ticket_size_min = ticket_min if ticket_min is not None else profile.ticket_size_min
                profile.ticket_size_max = ticket_max if ticket_max is not None else profile.ticket_size_max
                profile.preferred_countries = countries if countries else profile.preferred_countries
                profile.preferred_cities = cities if cities else profile.preferred_cities
                profile.notes = row.get("Notes") or profile.notes
                profile.internal_comments = row.get("Internal Comments") or profile.internal_comments
                profile.priority_score = priority if "Priority Score" in row else profile.priority_score
                profile.is_deleted = False  # Restore if soft-deleted
                profile.updated_by = admin.id
            else:
                profile = InvestorProfile(
                    user_id=user.id,
                    company_name=row.get("Company Name"),
                    designation=row.get("Designation"),
                    investor_type=row.get("Investor Type"),
                    linkedin_url=row.get("LinkedIn URL"),
                    website_url=row.get("Website URL"),
                    ticket_size_min=ticket_min,
                    ticket_size_max=ticket_max,
                    preferred_countries=countries,
                    preferred_cities=cities,
                    notes=row.get("Notes"),
                    internal_comments=row.get("Internal Comments"),
                    priority_score=priority,
                    created_by=admin.id,
                    is_deleted=False
                )
                db.add(profile)
                db.flush()

            if industries_list:
                profile.industries = _resolve_industries(db, industries_list)
            if stages_list:
                profile.stages = _resolve_stages(db, stages_list)

            imported_count += 1

        except Exception as e:
            db.rollback()
            errors.append(f"Row {idx}: Unexpected error: {str(e)}")
            skipped_count += 1

    db.commit()
    return {
        "status": "success",
        "imported": imported_count,
        "skipped": skipped_count,
        "errors": errors
    }


@router.get("/{id}", response_model=InvestorProfileResponse)
async def get_investor_profile(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    profile = db.query(InvestorProfile).filter(
        InvestorProfile.id == id,
        InvestorProfile.is_deleted == False
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Investor profile not found.")
    return profile


@router.patch("/{id}", response_model=InvestorProfileResponse)
async def update_investor_profile(
    id: int,
    body: InvestorProfileUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    profile = db.query(InvestorProfile).filter(
        InvestorProfile.id == id,
        InvestorProfile.is_deleted == False
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Investor profile not found.")

    profile.updated_by = admin.id

    data = body.model_dump(exclude_unset=True)

    if "industries" in data:
        profile.industries = _resolve_industries(db, data.pop("industries"))

    if "stages" in data:
        profile.stages = _resolve_stages(db, data.pop("stages"))

    for key, val in data.items():
        setattr(profile, key, val)

    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_investor_profile(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    profile = db.query(InvestorProfile).filter(
        InvestorProfile.id == id,
        InvestorProfile.is_deleted == False
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Investor profile not found.")

    # Soft delete
    profile.is_deleted = True
    profile.deleted_at = datetime.now(timezone.utc)
    profile.deleted_by = admin.id

    db.commit()
    return None
