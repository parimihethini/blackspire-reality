import math
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_optional_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.pagination import PaginatedResponse
from app.schemas.startup import StartupProfileResponse
from app.services import startup_service

router = APIRouter(prefix="/startups", tags=["Startup Marketplace"])


@router.get("/", response_model=PaginatedResponse[StartupProfileResponse])
async def list_public_startups(
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
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
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
        published_only=True,
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
async def get_startup_detail(
    startup_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    viewer_id = current_user.id if current_user else None
    return startup_service.get_public_startup(db, startup_id, viewer_id=viewer_id)
