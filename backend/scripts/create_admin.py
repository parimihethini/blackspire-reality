"""
Create or upgrade an admin user (verified, no OTP). Run from repo backend/:

  python scripts/create_admin.py --email admin@example.com --password 'SecurePass123' --name 'Admin'

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

from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--email", required=True)
    p.add_argument("--password", required=True)
    p.add_argument("--name", default="Administrator")
    args = p.parse_args()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == args.email).first()
        if user:
            user.role = UserRole.admin
            user.hashed_password = hash_password(args.password)
            user.is_verified = True
            user.is_active = True
            user.otp_code = None
            user.otp_expires_at = None
            print(f"Updated existing user to admin: {args.email}")
        else:
            user = User(
                name=args.name,
                email=args.email,
                phone=None,
                hashed_password=hash_password(args.password),
                role=UserRole.admin,
                is_verified=True,
                is_active=True,
            )
            db.add(user)
            print(f"Created admin: {args.email}")
        db.commit()
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
