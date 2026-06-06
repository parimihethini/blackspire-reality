from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: UserRole

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v.strip()


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime
    profile_image: Optional[str] = None

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = None

    @field_validator("role")
    @classmethod
    def normalize_login_role(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        role = v.strip().lower()
        # Legacy alias: 'agent' maps to 'seller'
        if role == "agent":
            return "seller"
        # Legacy alias: 'founder' maps to 'startup_founder'
        if role == "founder":
            return "startup_founder"
        valid_roles = {
            "customer", "seller", "admin",
            "super_admin", "team_member", "startup_founder", "investor",
        }
        if role in valid_roles:
            return role
        raise ValueError(
            "role must be one of: customer, seller, admin, "
            "super_admin, team_member, startup_founder, investor"
        )


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    user: UserResponse


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_pw(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class ResetOTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_pw(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class GoogleAuthRequest(BaseModel):
    id_token: str
    role: Optional[str] = "customer"


class LinkedInAuthRequest(BaseModel):
    code: str
    redirect_uri: str
    role: Optional[str] = "customer"


class LogoutResponse(BaseModel):
    message: str = "Logged out successfully"


class AdminUserRoleUpdate(BaseModel):
    role: UserRole


class AdminStatsResponse(BaseModel):
    # ── Legacy counts ─────────────────────────────────────────────────────────
    total_users: int
    customers: int
    sellers: int
    admins: int
    total_properties: int
    published_properties: int
    pending_listings: int

    # ── Phase 1 domain counts (populated once investor/startup models exist) ──
    super_admins: int = 0
    team_members: int = 0
    investors: int = 0
    startup_founders: int = 0
    total_investors: int = 0       # alias: investors count
    total_startups: int = 0        # populated after startup_profiles table
    new_investors_this_week: int = 0
    pending_startup_requests: int = 0
