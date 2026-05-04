from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
import os
import uuid
import logging
from app.services.cloudinary_service import upload_image
from cloudinary.exceptions import Error as CloudinaryError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import get_current_user, get_any_user, get_current_admin
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@router.post("/upload-profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload profile image to Cloudinary and persist URL in DB."""
    try:
        # Validate file type
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read and validate file size
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
            
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Maximum size: 5MB"
            )
        
        logger.info(f"[Upload] Processing image for user {current_user.id}: {file.filename} ({len(content)} bytes)")
        
        # Upload to Cloudinary with user ID for unique identification
        public_id = f"user_{current_user.id}"
        image_url = upload_image(content, public_id=public_id)
        
        logger.info(f"[Upload] Cloudinary upload successful: {image_url}")
        
        # Save URL to DB
        current_user.profile_image = image_url
        db.commit()
        db.refresh(current_user)
        
        return {"image_url": image_url, "message": "Profile image uploaded successfully"}
        
    except HTTPException:
        raise
    except CloudinaryError as e:
        error_detail = str(e)
        logger.error(f"[Upload] Cloudinary error for user {current_user.id}: {error_detail}")
        
        # Return user-friendly error messages
        if "permission" in error_detail.lower() or "forbidden" in error_detail.lower():
            raise HTTPException(
                status_code=503, 
                detail="Image upload service temporarily unavailable. Please try again later."
            )
        raise HTTPException(status_code=500, detail=f"Image upload failed: {error_detail}")
        
    except Exception as e:
        logger.error(f"[Upload] Unexpected error for user {current_user.id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="An unexpected error occurred during upload. Please try again."
        )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_any_user)):
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
