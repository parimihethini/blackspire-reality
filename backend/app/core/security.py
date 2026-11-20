from datetime import datetime, timedelta
from typing import Optional
import secrets
import string

import bcrypt
from jose import jwt

from app.core.config import settings


def _get_jwt_secret() -> str:
    secret = settings.SECRET_KEY
    if hasattr(secret, "get_secret_value"):
        return secret.get_secret_value()
    return str(secret)


def hash_password(password: str) -> str:
    """Hash password using native bcrypt (compatible with bcrypt 4.x/5.x and Python 3.14)."""
    if password is None:
        raise ValueError("password is required")
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify plain password against stored bcrypt hash."""
    if plain is None or hashed is None:
        return False
    stored = (hashed or "").strip()
    if not stored or not stored.startswith("$2"):
        return False
    try:
        pw_bytes = plain.encode("utf-8")[:72]
        return bcrypt.checkpw(pw_bytes, stored.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload.update({"exp": expire, "type": "access"})
    return jwt.encode(payload, _get_jwt_secret(), algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    payload = data.copy()
    refresh_days = getattr(settings, "REFRESH_TOKEN_EXPIRE_DAYS", 7)
    expire = datetime.utcnow() + timedelta(days=refresh_days)
    payload.update({"exp": expire, "type": "refresh"})
    return jwt.encode(payload, _get_jwt_secret(), algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, _get_jwt_secret(), algorithms=[settings.ALGORITHM])


def generate_otp(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


def generate_token() -> str:
    return secrets.token_urlsafe(32)