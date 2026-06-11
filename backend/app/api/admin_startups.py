import math
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_admin_user, get_current_team_member
from app.db.session import get_db
from app.models.user import User
from app.schemas.pagination import PaginatedResponse
from app.schemas.startup import ModerationAction, StartupProfileResponse, StartupProfileUpdate
from app.services import startup_service

router = APIRouter(prefix="/admin/startups", tags=["Startup Management"])


@router.get("/", response_model=PaginatedResponse[StartupProfileResponse])
async def admin_list_startups(
    q: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    funding_min: Optional[float] = Query(None),
    funding_max: Optional[float] = Query(None),
    revenue_min: Optional[float] = Query(None),
    revenue_max: Optional[float] = Query(None),
    team_size_min: Optional[int] = Query(None),
    team_size_max: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    verification_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_team_member),
):
    items, total = startup_service.list_startup_profiles(
        db,
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
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if per_page else 0,
    )


@router.get("/{startup_id}", response_model=StartupProfileResponse)
async def admin_get_startup(
    startup_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_team_member),
):
    return startup_service.get_startup_profile(db, startup_id)


@router.patch("/{startup_id}", response_model=StartupProfileResponse)
async def admin_update_startup(
    startup_id: int,
    body: StartupProfileUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    return startup_service.update_startup_profile(db, startup_id, body, admin, is_admin=True)


@router.delete("/{startup_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_startup(
    startup_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    startup_service.delete_startup_profile(db, startup_id, admin, is_admin=True)


@router.post("/{startup_id}/approve", response_model=StartupProfileResponse)
async def approve_startup(
    startup_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_team_member),
):
    return startup_service.approve_startup(db, startup_id, admin)


@router.post("/{startup_id}/reject", response_model=StartupProfileResponse)
async def reject_startup(
    startup_id: int,
    body: ModerationAction = ModerationAction(),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_team_member),
):
    return startup_service.reject_startup(db, startup_id, admin, body.reason)


@router.post("/{startup_id}/verify", response_model=StartupProfileResponse)
async def verify_startup(
    startup_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_team_member),
):
    return startup_service.verify_startup(db, startup_id, admin)


@router.post("/{startup_id}/suspend", response_model=StartupProfileResponse)
async def suspend_startup(
    startup_id: int,
    body: ModerationAction = ModerationAction(),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_team_member),
):
    return startup_service.suspend_startup(db, startup_id, admin, body.reason)
