from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
import os
import uuid
from app.services.cloudinary_service import upload_image
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import get_current_user, get_any_user, get_current_admin
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter()

def _to_public_image_url(request: Request, profile_image: str | None) -> str | None:
    if not profile_image:
        return None
    if profile_image.startswith("http://") or profile_image.startswith("https://"):
        return profile_image
    normalized = profile_image.lstrip("/")
    return str(request.base_url).rstrip("/") + f"/{normalized}"


@router.post("/upload-profile-image")
async def upload_profile_image(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload profile image to Cloudinary and persist URL in DB."""
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # Upload to Cloudinary
        image_url = upload_image(content)
        
        if not image_url:
            raise HTTPException(status_code=500, detail="Cloudinary upload failed")
        
        # Save URL to DB
        current_user.profile_image = image_url
        db.commit()
        db.refresh(current_user)
        
        return {"image_url": image_url}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Upload] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload image")


@router.get("/me", response_model=UserResponse)
def get_me(request: Request, current_user: User = Depends(get_any_user)):
    current_user.profile_image = _to_public_image_url(request, current_user.profile_image)
    return current_user



@router.put("/me", response_model=UserResponse)
def update_me(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    if data.name is not None:
        current_user.name = data.name
    if data.phone is not None:
        current_user.phone = data.phone
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return db.query(User).all()


@router.delete("/{user_id}")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"message": f"User {user_id} deactivated"}
