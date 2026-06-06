"""Permission checking for Phase 1 RBAC."""

from sqlalchemy.orm import Session

from app.models.rbac import Permission, Role, UserRoleAssignment
from app.models.user import User


def _role_name(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def user_has_permission(db: Session, user: User, permission_name: str) -> bool:
    """Check if user's role grants the given permission."""
    role_name = _role_name(user)
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        return False
    return (
        db.query(Permission)
        .join(Permission.roles)
        .filter(Role.id == role.id, Permission.name == permission_name)
        .first()
        is not None
    )


def sync_user_role_assignment(db: Session, user: User) -> None:
    """Keep user_roles table aligned with users.role (backward compatible)."""
    role_name = _role_name(user)
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        return

    existing = (
        db.query(UserRoleAssignment)
        .filter(UserRoleAssignment.user_id == user.id)
        .all()
    )
    if len(existing) == 1 and existing[0].role_id == role.id:
        return

    db.query(UserRoleAssignment).filter(UserRoleAssignment.user_id == user.id).delete(
        synchronize_session=False
    )
    db.add(UserRoleAssignment(user_id=user.id, role_id=role.id))
