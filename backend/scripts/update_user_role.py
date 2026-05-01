"""
Update a user's role by email. Run:

    cd backend
    python scripts/update_user_role.py

Uses DATABASE_URL from app settings (see .env / app.core.config).
"""
from pathlib import Path
import sys

_backend_root = Path(__file__).resolve().parent.parent
if str(_backend_root) not in sys.path:
    sys.path.insert(0, str(_backend_root))

from app.db.session import SessionLocal
from app.models.user import User, UserRole

# Import related models so SQLAlchemy can resolve User relationships
import app.models.property  # noqa: F401
import app.models.review  # noqa: F401
import app.models.investment  # noqa: F401

TARGET_EMAIL = "change-me@example.com"
NEW_ROLE = UserRole.customer


def main() -> int:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == TARGET_EMAIL).first()
        if not user:
            print(f"No user found with email: {TARGET_EMAIL}")
            return 1

        before = user.role
        user.role = NEW_ROLE
        db.commit()
        db.refresh(user)
        print(f"OK: {TARGET_EMAIL} role updated {before!s} -> {user.role!s}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
