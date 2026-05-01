from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from jose import JWTError

from app.db.session import get_db
from app.core.security import decode_token

# Standard Bearer JWT from Authorization header (OpenAPI: click Authorize → Bearer <token>)
http_bearer = HTTPBearer(auto_error=True)


def _role_str(role) -> str:
    return role.value if hasattr(role, "value") else str(role)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
    db: Session = Depends(get_db),
):
    from app.models.user import User

    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = credentials.credentials
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exc

        token_role = payload.get("role")

        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise credentials_exc

        if token_role is not None and _role_str(user.role) != str(token_role):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token role mismatch",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(status_code=400, detail="Account deactivated")

        return user
    except HTTPException:
        raise
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:
        raise credentials_exc


def require_role(*roles: str):
    async def checker(current_user=Depends(get_current_user)):
        if _role_str(current_user.role) not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires role: {', '.join(roles)}",
            )
        return current_user

    return checker


get_current_customer = require_role("customer")
get_current_seller = require_role("seller")
get_current_admin = require_role("admin")
# Explicit alias for admin routers / docs
get_current_admin_user = get_current_admin
get_any_user = require_role("customer", "seller", "admin")
