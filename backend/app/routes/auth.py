from datetime import timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.user import Token

router = APIRouter(prefix="/auth", tags=["Authentication & Roles"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class RegisterRequest(BaseModel):
    name: Optional[str] = None
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field(default="startup_founder")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        email: Optional[str] = payload.get("sub")
        if not email:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise credentials_exception
    return user


def require_role(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        role_val = current_user.role.value if isinstance(current_user.role, UserRole) else str(current_user.role)
        if role_val not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role permissions",
            )
        return current_user

    return role_checker


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Registers a new user in PostgreSQL with bcrypt password hashing and role assignment."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    try:
        user_role = UserRole(payload.role)
    except ValueError:
        user_role = UserRole.customer

    display_name = (payload.name or payload.email.split("@")[0]).strip()
    new_user = User(
        name=display_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=user_role,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role.value,
    }


def _issue_tokens_for_user(user: User) -> dict:
    role_val = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id, "role": role_val},
        expires_delta=expires,
    )
    refresh_token = create_refresh_token(
        data={"sub": user.email, "user_id": user.id, "role": role_val}
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": role_val,
        },
    }


@router.post("/login", response_model=Token)
def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """OAuth2 form login endpoint (used by Swagger UI Authorize button)."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _issue_tokens_for_user(user)


@router.post("/login/json")
def login_json(payload: LoginRequest, db: Session = Depends(get_db)):
    """JSON login endpoint for frontend apps."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    return _issue_tokens_for_user(user)


@router.get("/me")
def read_current_user(current_user: User = Depends(get_current_user)):
    role_val = current_user.role.value if isinstance(current_user.role, UserRole) else str(current_user.role)
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": role_val,
    }


@router.get("/admin/metrics", dependencies=[Depends(require_role(["super_admin", "admin"]))])
def get_admin_metrics():
    """Protected route restricted to Admins and Super Admins."""
    return {"status": "success", "data": "Platform analytics and startup requests summary."}