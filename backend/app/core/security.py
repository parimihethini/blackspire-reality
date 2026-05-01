from datetime import datetime, timedelta
from typing import Optional
import secrets
import string

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Single source of truth: Passlib bcrypt. Never store plain text."""
    if password is None:
        raise ValueError("password is required")
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify with the same pwd_context used at registration."""
    if plain is None or hashed is None:
        return False
    stored = (hashed or "").strip()
    if not stored:
        return False
    if not stored.startswith("$2"):
        return False
    try:
        return pwd_context.verify(plain, stored)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload.update({"exp": expire, "type": "access"})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload.update({"exp": expire, "type": "refresh"})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def generate_otp(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


def generate_token() -> str:
    return secrets.token_urlsafe(32)
