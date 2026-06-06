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
    ResetOTPVerifyRequest, GoogleAuthRequest, LinkedInAuthRequest, LogoutResponse,
)
from app.services.email_service import send_otp_email, send_reset_email, EmailDeliveryError
from app.services.oauth_service import OAuthError, verify_google_id_token, exchange_linkedin_code, linkedin_auth_url
from app.core.permissions import sync_user_role_assignment

router = APIRouter()

# Roles that cannot be created via public registration or OAuth self-signup
_BLOCKED_PUBLIC_ROLES = {
    UserRole.admin,
    UserRole.super_admin,
    UserRole.team_member,
}


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
    if role == "founder":
        return "startup_founder"
    return role


def _resolve_signup_role(role_value: str | None, default: UserRole = UserRole.customer) -> UserRole:
    role = _normalize_login_role(role_value) or default.value
    mapping = {
        "customer": UserRole.customer,
        "seller": UserRole.seller,
        "investor": UserRole.investor,
        "startup_founder": UserRole.startup_founder,
    }
    resolved = mapping.get(role, default)
    if resolved in _BLOCKED_PUBLIC_ROLES:
        raise HTTPException(status_code=403, detail=f"Role '{role}' cannot be assigned via self-registration.")
    return resolved


def _oauth_login_or_register(
    db: Session,
    *,
    email: str,
    name: str,
    provider: str,
    google_id: str | None = None,
    linkedin_id: str | None = None,
    profile_image: str | None = None,
    role: UserRole = UserRole.customer,
) -> User:
    user = db.query(User).filter(func.lower(User.email) == email.lower()).first()

    if user:
        if google_id and not user.google_id:
            user.google_id = google_id
        if linkedin_id and not user.linkedin_id:
            user.linkedin_id = linkedin_id
        if profile_image and not user.profile_image:
            user.profile_image = profile_image
        user.auth_provider = provider
        user.is_verified = True
        sync_user_role_assignment(db, user)
        db.commit()
        db.refresh(user)
        return user

    user = User(
        name=name,
        email=email,
        hashed_password=None,
        role=role,
        profile_image=profile_image,
        google_id=google_id,
        linkedin_id=linkedin_id,
        auth_provider=provider,
        is_verified=True,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    sync_user_role_assignment(db, user)
    db.commit()
    return user


@router.post("/register", status_code=201)
async def register(data: UserCreate, db: Session = Depends(get_db)):
    if data.role in _BLOCKED_PUBLIC_ROLES:
        raise HTTPException(
            status_code=403,
            detail="This account type cannot be created through public registration.",
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
    sync_user_role_assignment(db, user)
    db.commit()

    if settings.AUTH_DEBUG or settings.DEBUG:
        preview = f"{hashed[:14]}...{hashed[-8:]}" if len(hashed) > 22 else hashed
        check = verify_password(data.password, user.hashed_password)
        print(f"[AUTH_DEBUG] register email={user.email} hash_stored={preview} verify_roundtrip={check}")

    try:
        send_otp_email(user.email, otp)
    except EmailDeliveryError as e:
        print(f"[Email] register OTP failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="Could not send verification email. Please try again in a few minutes.",
        )

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
        send_otp_email(user.email, otp)
    except EmailDeliveryError as e:
        print(f"[Email] resend OTP failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="Could not send OTP email. Please try again in a few minutes.",
        )
    return {"message": "OTP resent to your email"}


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    try:
        email = data.email.strip().lower()
        user = db.query(User).filter(func.lower(User.email) == email).first()
        password_ok = bool(user) and verify_password(data.password, (user.hashed_password or "").strip())

        if settings.AUTH_DEBUG or settings.DEBUG:
            hp = user.hashed_password if user else None
            preview = f"{hp[:14]}...{hp[-8:]}" if hp and len(hp) > 22 else hp
            print(
                f"[AUTH_DEBUG] login email={data.email} user_found={bool(user)} "
                f"stored_hash={preview} verify_ok={password_ok}"
            )

        if not user:
            raise HTTPException(status_code=401, detail="No account found for this email")
        if not user.hashed_password:
            raise HTTPException(
                status_code=401,
                detail="This account uses social login. Sign in with Google or LinkedIn.",
            )
        if not password_ok:
            raise HTTPException(status_code=401, detail="Invalid password")

        requested_role = _normalize_login_role(data.role)
        actual_role = _normalize_login_role(user.role)
        if requested_role is not None and actual_role != requested_role:
            admin_alias = requested_role == "admin" and actual_role == "super_admin"
            if not admin_alias:
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
    print("RESET EMAIL:", data.email)
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        print(f"[Email] No account for {data.email} — reset email not sent (register first)")
        return {"message": "If the email exists, a reset link and OTP have been sent."}

    token = generate_token()
    otp = generate_otp()
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    user.reset_otp_hash = hash_password(otp)
    user.reset_otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    user.reset_otp_attempts = 0
    db.commit()
    try:
        send_reset_email(user.email, user.name, token, otp)
    except EmailDeliveryError as e:
        print(f"[Email] reset email failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="Could not send reset email. Please try again in a few minutes.",
        )
    return {"message": "If the email exists, a reset link and OTP have been sent."}


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
    user.reset_otp_hash = None
    user.reset_otp_expires_at = None
    user.reset_otp_attempts = 0
    db.commit()
    return {"message": "Password reset successfully"}


@router.post("/logout", response_model=LogoutResponse)
async def logout():
    """Stateless JWT logout — client clears stored tokens."""
    return LogoutResponse()


@router.post("/admin/login", response_model=TokenResponse)
async def admin_login(data: LoginRequest, db: Session = Depends(get_db)):
    """Dedicated admin portal login (admin + super_admin only)."""
    email = data.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    if _role_str(user.role) not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not an admin account.")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified.")
    return _build_token_response(user)


@router.post("/google", response_model=TokenResponse)
async def google_auth(data: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        profile = verify_google_id_token(data.id_token)
    except OAuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    role = _resolve_signup_role(data.role)
    user = _oauth_login_or_register(
        db,
        email=profile["email"],
        name=profile["name"],
        provider="google",
        google_id=profile["google_id"],
        profile_image=profile.get("picture"),
        role=role,
    )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")
    return _build_token_response(user)


@router.get("/linkedin/url")
async def linkedin_auth_url_endpoint(redirect_uri: str, state: str = "blackspire"):
    try:
        url = linkedin_auth_url(redirect_uri, state)
    except OAuthError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return {"url": url}


@router.post("/linkedin", response_model=TokenResponse)
async def linkedin_auth(data: LinkedInAuthRequest, db: Session = Depends(get_db)):
    try:
        profile = exchange_linkedin_code(data.code, data.redirect_uri)
    except OAuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    role = _resolve_signup_role(data.role)
    user = _oauth_login_or_register(
        db,
        email=profile["email"],
        name=profile["name"],
        provider="linkedin",
        linkedin_id=profile["linkedin_id"],
        profile_image=profile.get("picture"),
        role=role,
    )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")
    return _build_token_response(user)


@router.post("/verify-reset-otp")
async def verify_reset_otp(data: ResetOTPVerifyRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not user.reset_otp_hash or not user.reset_otp_expires_at:
        raise HTTPException(status_code=400, detail="No OTP requested")
        
    if datetime.utcnow() > user.reset_otp_expires_at.replace(tzinfo=None):
        raise HTTPException(status_code=400, detail="OTP has expired. Request a new one.")
        
    if (user.reset_otp_attempts or 0) >= 5:
        raise HTTPException(status_code=429, detail="Too many failed attempts. Request a new OTP.")
        
    if not verify_password(data.otp, user.reset_otp_hash):
        user.reset_otp_attempts = (user.reset_otp_attempts or 0) + 1
        db.commit()
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {5 - user.reset_otp_attempts} attempts left.")
        
    user.hashed_password = hash_password(data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    user.reset_otp_hash = None
    user.reset_otp_expires_at = None
    user.reset_otp_attempts = 0
    db.commit()
    return {"message": "Password reset successfully"}
