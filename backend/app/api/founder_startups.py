import os

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_founder
from app.db.session import get_db
from app.models.user import User
from app.schemas.startup import (
    FounderDashboardResponse,
    StartupProfileCreate,
    StartupProfileResponse,
    StartupProfileUpdate,
)
from app.services import startup_service
from app.services.cloudinary_service import upload_image
from cloudinary.exceptions import Error as CloudinaryError

router = APIRouter(prefix="/founder/startups", tags=["Founder Startups"])

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_DECK_EXTENSIONS = {".pdf", ".ppt", ".pptx"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024
MAX_DECK_SIZE = 20 * 1024 * 1024


@router.get("/dashboard", response_model=FounderDashboardResponse)
async def founder_dashboard(
    db: Session = Depends(get_db),
    founder: User = Depends(get_current_founder),
):
    return startup_service.get_founder_dashboard(db, founder)


@router.get("/me", response_model=list[StartupProfileResponse])
async def list_my_startups(
    db: Session = Depends(get_db),
    founder: User = Depends(get_current_founder),
):
    return startup_service.list_founder_startups(db, founder)


@router.post("/", response_model=StartupProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_startup(
    body: StartupProfileCreate,
    db: Session = Depends(get_db),
    founder: User = Depends(get_current_founder),
):
    return startup_service.create_startup_profile(db, body, founder)


@router.patch("/{startup_id}", response_model=StartupProfileResponse)
async def update_startup(
    startup_id: int,
    body: StartupProfileUpdate,
    db: Session = Depends(get_db),
    founder: User = Depends(get_current_founder),
):
    return startup_service.update_startup_profile(db, startup_id, body, founder)


@router.delete("/{startup_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_startup(
    startup_id: int,
    db: Session = Depends(get_db),
    founder: User = Depends(get_current_founder),
):
    startup_service.delete_startup_profile(db, startup_id, founder)


@router.post("/{startup_id}/submit", response_model=StartupProfileResponse)
async def submit_startup(
    startup_id: int,
    db: Session = Depends(get_db),
    founder: User = Depends(get_current_founder),
):
    return startup_service.submit_startup_for_review(db, startup_id, founder)


@router.post("/{startup_id}/logo", response_model=StartupProfileResponse)
async def upload_logo(
    startup_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    founder: User = Depends(get_current_founder),
):
    profile = startup_service.get_startup_profile(db, startup_id)
    startup_service.assert_founder_owns(profile, founder)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid image type")

    content = await file.read()
    if not content or len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Invalid or oversized image")

    try:
        url = upload_image(content, public_id=f"startup_logo_{startup_id}")
    except CloudinaryError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return startup_service.update_startup_profile(
        db,
        startup_id,
        StartupProfileUpdate(logo_url=url),
        founder,
    )


@router.post("/{startup_id}/pitch-deck", response_model=StartupProfileResponse)
async def upload_pitch_deck(
    startup_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    founder: User = Depends(get_current_founder),
):
    profile = startup_service.get_startup_profile(db, startup_id)
    startup_service.assert_founder_owns(profile, founder)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_DECK_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid pitch deck type. Allowed: PDF, PPT, PPTX")

    content = await file.read()
    if not content or len(content) > MAX_DECK_SIZE:
        raise HTTPException(status_code=400, detail="Invalid or oversized file")

    try:
        url = upload_image(content, public_id=f"startup_deck_{startup_id}")
    except CloudinaryError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return startup_service.update_startup_profile(
        db,
        startup_id,
        StartupProfileUpdate(pitch_deck_url=url),
        founder,
    )
