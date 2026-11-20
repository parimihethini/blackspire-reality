from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    phone: Optional[str] = None
    role: str
    profile_image: Optional[str] = None
    auth_provider: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    created_at: Optional[datetime] = None


# Alias expected by users.py and admin.py
UserResponse = UserOut


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None


class AdminUserRoleUpdate(BaseModel):
    role: str
    is_active: Optional[bool] = None


class AdminStatsResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    total_users: int = 0
    total_properties: int = 0
    total_investments: int = 0
    total_revenue: float = 0.0
    stats: Optional[Dict[str, Any]] = None


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None
    role: str = Field(default="customer")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    user: UserOut


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)


class ResetOTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str = Field(..., min_length=6)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class GoogleAuthRequest(BaseModel):
    id_token: str
    role: Optional[str] = None


class LinkedInAuthRequest(BaseModel):
    code: str
    redirect_uri: str
    role: Optional[str] = None


class LogoutResponse(BaseModel):
    message: str = "Logged out successfully"