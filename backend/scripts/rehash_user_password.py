"""
Set a user's password to a new value (properly bcrypt-hashed). Use when a row has a
bad hash or plain-text mistake.

  cd backend
  python scripts/rehash_user_password.py --email you@example.com --password 'NewPass123'

"""
from __future__ import annotations

import argparse
from pathlib import Path
import sys

_backend_root = Path(__file__).resolve().parent.parent
if str(_backend_root) not in sys.path:
    sys.path.insert(0, str(_backend_root))

from app.db.session import SessionLocal
from app.models.user import User

import app.models.property  # noqa: F401
import app.models.review  # noqa: F401
import app.models.investment  # noqa: F401

from app.core.security import hash_password, verify_password


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--email", required=True)
    p.add_argument("--password", required=True)
    args = p.parse_args()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == args.email).first()
        if not user:
            print(f"No user: {args.email}")
            return 1

        new_hash = hash_password(args.password)
        user.hashed_password = new_hash
        db.commit()
        db.refresh(user)

        ok = verify_password(args.password, user.hashed_password)
        preview = f"{new_hash[:14]}…{new_hash[-8:]}" if len(new_hash) > 22 else new_hash
        print(f"OK: updated {args.email} hash={preview} verify_roundtrip={ok}")
        return 0 if ok else 2
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
