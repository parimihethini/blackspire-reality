"""
Create or upgrade a privileged user (admin bootstrap only — not exposed via API).

Run from repo backend/:

  python scripts/create_admin.py --email admin@yourcompany.com --password '$ENV_ADMIN_PASSWORD' --name 'Platform Admin'
  python scripts/create_admin.py --email admin@yourcompany.com --password '$ENV_ADMIN_PASSWORD' --role super_admin

Allowed roles: admin, super_admin, team_member (internal staff only).
"""
from __future__ import annotations

import argparse
from pathlib import Path
import sys

_backend_root = Path(__file__).resolve().parent.parent
if str(_backend_root) not in sys.path:
    sys.path.insert(0, str(_backend_root))

import app.models.property  # noqa: F401
import app.models.review  # noqa: F401
import app.models.investment  # noqa: F401
import app.models.rbac  # noqa: F401

from app.db.session import SessionLocal
from app.db.seed_rbac import seed_rbac
from app.models.user import User, UserRole
from app.core.security import hash_password
from app.core.permissions import sync_user_role_assignment

_BOOTSTRAP_ROLES = {
    "admin": UserRole.admin,
    "super_admin": UserRole.super_admin,
    "team_member": UserRole.team_member,
}


def main() -> int:
    p = argparse.ArgumentParser(description="Bootstrap admin or internal staff account")
    p.add_argument("--email", required=True, help="Admin email (lowercased on save)")
    p.add_argument("--password", required=True, help="Min 8 characters")
    p.add_argument("--name", default="Administrator")
    p.add_argument(
        "--role",
        default="admin",
        choices=sorted(_BOOTSTRAP_ROLES.keys()),
        help="Privileged role to assign (default: admin)",
    )
    args = p.parse_args()

    if len(args.password) < 8:
        print("Error: password must be at least 8 characters.", file=sys.stderr)
        return 1

    email = args.email.strip().lower()
    target_role = _BOOTSTRAP_ROLES[args.role]

    db = SessionLocal()
    try:
        seed_rbac(db)

        user = db.query(User).filter(User.email == email).first()
        if user:
            user.role = target_role
            user.name = args.name or user.name
            user.hashed_password = hash_password(args.password)
            user.is_verified = True
            user.is_active = True
            user.otp_code = None
            user.otp_expires_at = None
            db.commit()
            db.refresh(user)
            sync_user_role_assignment(db, user)
            db.commit()
            print(f"Updated existing user to {args.role}: {email} (id={user.id})")
        else:
            user = User(
                name=args.name,
                email=email,
                phone=None,
                hashed_password=hash_password(args.password),
                role=target_role,
                is_verified=True,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            sync_user_role_assignment(db, user)
            db.commit()
            print(f"Created {args.role}: {email} (id={user.id})")

        print(f"[OK] Role synced to user_roles table for {args.role}")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
