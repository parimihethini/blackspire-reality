"""
Utility script: reset a user's password directly in the DB.
Usage:  python reset_password.py <email> <new_password>
"""
import sys
# Must import ALL models so SQLAlchemy relationship mapper resolves correctly
import app.models.user          # noqa
import app.models.property      # noqa
import app.models.investment    # noqa
import app.models.favorite      # noqa
import app.models.review        # noqa
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import hash_password, verify_password


def reset(email: str, new_password: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"[ERROR] No user found with email: {email}")
            return

        new_hash = hash_password(new_password)
        user.hashed_password = new_hash
        db.commit()
        db.refresh(user)

        # Verify it works immediately
        ok = verify_password(new_password, user.hashed_password)
        print(f"[OK] Password reset for {email}")
        print(f"     New hash : {new_hash[:14]}...{new_hash[-8:]}")
        print(f"     Verify   : {ok}")
        print(f"     Role     : {user.role}")
        print(f"     Verified : {user.is_verified}")
        print(f"     Active   : {user.is_active}")

        if not user.is_verified:
            print("[WARN] User is NOT email-verified — login will fail until OTP is completed.")
            ans = input("Mark as verified now? (y/n): ").strip().lower()
            if ans == "y":
                user.is_verified = True
                db.commit()
                print("[OK] User marked as verified.")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python reset_password.py <email> <new_password>")
        sys.exit(1)
    reset(sys.argv[1], sys.argv[2])
