from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.user import User, UserRole
from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    generate_token,
)
from app.schemas.user import (
    UserCreate, LoginRequest, TokenResponse, OTPVerifyRequest,
    PasswordResetRequest, PasswordResetConfirm, RefreshTokenRequest,
)
from app.services.email_service import send_otp, send_reset_email

router = APIRouter()


def _role_str(value) -> str:
    """Normalize SQLAlchemy / Pydantic enum or str to a plain string."""
    return value.value if hasattr(value, "value") else str(value)


def _build_token_response(user: User) -> dict:
    role = _role_str(user.role)
    token_data = {"sub": str(user.id), "role": role}
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
        "role": role,
        "user": user,
    }


def _normalize_login_role(value) -> str | None:
    if value is None:
        return None
    role = _role_str(value).strip().lower()
    if role == "agent":
        return "seller"
    return role


@router.post("/register", status_code=201)
async def register(data: UserCreate, db: Session = Depends(get_db)):
    if data.role == UserRole.admin:
        raise HTTPException(
            status_code=403,
            detail="Admin accounts cannot be created through public registration.",
        )

    # Block duplicate email across ALL roles
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Email already registered as '{existing.role}'. Each email can only have one role.",
        )

    otp = generate_otp()
    expires = datetime.utcnow() + timedelta(minutes=10)

    hashed = hash_password(data.password)
    user = User(
        name=data.name,
        email=data.email,
        phone=data.phone,
        hashed_password=hashed,
        role=data.role,
        otp_code=otp,
        otp_expires_at=expires,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if settings.AUTH_DEBUG or settings.DEBUG:
        preview = f"{hashed[:14]}…{hashed[-8:]}" if len(hashed) > 22 else hashed
        check = verify_password(data.password, user.hashed_password)
        print(f"[AUTH_DEBUG] register email={user.email} hash_stored={preview} verify_roundtrip={check}")

    try:
        send_otp(user.email, user.name, otp)
    except Exception as e:
        print("EMAIL ERROR:", str(e))
        raise HTTPException(status_code=500, detail="Failed to send OTP")

    return {
        "message": "User registered. OTP sent to email.",
        "email": user.email,
        "role": user.role,
    }


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(data: OTPVerifyRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already verified — if so, they shouldn't be here, but let's allow it as a login
    if user.is_verified:
        return _build_token_response(user)

    if user.otp_code != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if user.otp_expires_at and datetime.utcnow() > user.otp_expires_at.replace(tzinfo=None):
        raise HTTPException(status_code=400, detail="OTP has expired. Request a new one.")

    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()

    # Log them in automatically
    return _build_token_response(user)


@router.post("/resend-otp")
async def resend_otp(data: PasswordResetRequest, db: Session = Depends(get_db)):
    print("RESEND OTP CALLED", {"email": data.email})
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        return {"message": "Already verified"}

    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    try:
        send_otp(user.email, user.name, otp)
    except Exception as e:
        print("EMAIL ERROR:", str(e))
        raise HTTPException(status_code=500, detail="Failed to send OTP")
    return {"message": "OTP resent to your email"}


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    try:
        email = data.email.strip().lower()
        user = db.query(User).filter(func.lower(User.email) == email).first()
        password_ok = bool(user) and verify_password(data.password, (user.hashed_password or "").strip())

        if settings.AUTH_DEBUG or settings.DEBUG:
            hp = user.hashed_password if user else None
            preview = f"{hp[:14]}…{hp[-8:]}" if hp and len(hp) > 22 else hp
            print(
                f"[AUTH_DEBUG] login email={data.email} user_found={bool(user)} "
                f"stored_hash={preview} verify_ok={password_ok}"
            )

        if not user:
            raise HTTPException(status_code=401, detail="No account found for this email")
        if not password_ok:
            raise HTTPException(status_code=401, detail="Invalid password")

        requested_role = _normalize_login_role(data.role)
        actual_role = _normalize_login_role(user.role)
        if requested_role is not None and actual_role != requested_role:
            raise HTTPException(
                status_code=403,
                detail=f"This email is registered as '{actual_role}', not '{requested_role}'.",
            )
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Account is deactivated")
        if not user.is_verified:
            raise HTTPException(
                status_code=403,
                detail="Email not verified. Please verify your OTP first.",
            )

        return _build_token_response(user)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/refresh")
async def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    from jose import JWTError
    try:
        payload = decode_token(data.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=400, detail="Invalid token type")
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = _role_str(user.role)
    token_data = {"sub": str(user.id), "role": role}
    return {
        "access_token": create_access_token(token_data),
        "token_type": "bearer",
        "role": role,
    }


@router.post("/forgot-password")
async def forgot_password(data: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if user:
        token = generate_token()
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        try:
            send_reset_email(user.email, user.name, token)
        except Exception as e:
            print("EMAIL ERROR:", str(e))
            raise HTTPException(status_code=500, detail="Failed to send password reset email")
    return {"message": "If the email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(data: PasswordResetConfirm, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == data.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if user.reset_token_expires and datetime.utcnow() > user.reset_token_expires.replace(tzinfo=None):
        raise HTTPException(status_code=400, detail="Reset token has expired")

    user.hashed_password = hash_password(data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return {"message": "Password reset successfully"}
