"""One-time admin bootstrap from environment variables (Render shell alternative)."""

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import sync_user_role_assignment
from app.core.security import hash_password
from app.models.user import User, UserRole


def bootstrap_admin_if_needed(db: Session) -> None:
    """
    Create the first admin when BOOTSTRAP_ADMIN_EMAIL + BOOTSTRAP_ADMIN_PASSWORD are set
    and no admin/super_admin accounts exist yet.
    """
    email = (settings.BOOTSTRAP_ADMIN_EMAIL or "").strip().lower()
    password = settings.BOOTSTRAP_ADMIN_PASSWORD or ""
    if not email or not password:
        return

    if len(password) < 8:
        print("[Bootstrap] BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters — skipped")
        return

    existing = (
        db.query(User)
        .filter(User.role.in_([UserRole.admin, UserRole.super_admin]))
        .count()
    )
    if existing > 0:
        return

    role_name = (settings.BOOTSTRAP_ADMIN_ROLE or "admin").strip().lower()
    role_map = {
        "admin": UserRole.admin,
        "super_admin": UserRole.super_admin,
    }
    role = role_map.get(role_name, UserRole.admin)

    user = User(
        name=settings.BOOTSTRAP_ADMIN_NAME or "Platform Administrator",
        email=email,
        hashed_password=hash_password(password),
        role=role,
        is_verified=True,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    sync_user_role_assignment(db, user)
    db.commit()
    print(f"[Bootstrap] Created first {role.value} account: {email} (id={user.id})")
