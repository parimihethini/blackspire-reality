import math
from typing import Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from app.db.session import get_db
from app.models.user import User
from app.core.dependencies import get_current_admin_user
from app.schemas.investor import (
    InvestorProfileCreate,
    InvestorProfileUpdate,
    InvestorProfileResponse,
)
from app.schemas.pagination import PaginatedResponse
from app.services import investor_service

router = APIRouter(prefix="/admin/investors", tags=["Investor Management"])


@router.post("/", response_model=InvestorProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_investor_profile(
    body: InvestorProfileCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    return investor_service.create_investor_profile(db, body, admin.id)


@router.get("/", response_model=PaginatedResponse[InvestorProfileResponse])
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
    items, total = investor_service.list_investor_profiles(
        db,
        q=q,
        investor_type=investor_type,
        stage=stage,
        industry=industry,
        city=city,
        country=country,
        ticket_size_min=ticket_size_min,
        ticket_size_max=ticket_size_max,
        priority_score=priority_score,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    pages = math.ceil(total / per_page) if per_page else 0
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.get("/export")
async def export_investors_csv(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    content = investor_service.export_investors_csv(db)
    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=investors_export.csv"},
    )


@router.post("/import")
async def import_investors_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    if not file.filename or not file.filename.endswith(".csv"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    content = await file.read()
    return investor_service.import_investors_csv(db, content, admin.id)


@router.get("/{id}", response_model=InvestorProfileResponse)
async def get_investor_profile(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    return investor_service.get_investor_profile(db, id)


@router.patch("/{id}", response_model=InvestorProfileResponse)
async def update_investor_profile(
    id: int,
    body: InvestorProfileUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    return investor_service.update_investor_profile(db, id, body, admin.id)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_investor_profile(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    investor_service.delete_investor_profile(db, id, admin.id)
    return None
