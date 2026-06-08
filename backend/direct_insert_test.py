"""
Direct ORM insert test for property creation.
The seller email is read from TEST_SELLER_EMAIL in the environment.

Required env vars (add to backend/.env for local use):
  TEST_SELLER_EMAIL=your_seller@example.com
"""
import os
import sys
import traceback
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

sys.path.insert(0, ".")

from app.db.session import SessionLocal
from app.models.user import User
from app.models.property import Property, PropertyType, PropertyStatus, ApprovalType

seller_email = os.environ.get("TEST_SELLER_EMAIL")
if not seller_email:
    raise SystemExit(
        "ERROR: TEST_SELLER_EMAIL must be set in the environment.\n"
        "Add it to backend/.env — never hardcode credentials in source files."
    )

db = SessionLocal()
user = db.query(User).filter(User.email == seller_email).first()
if not user:
    db.close()
    raise SystemExit(f"ERROR: User '{seller_email}' not found in the database.")

print("User ID:", user.id, "email:", user.email)

try:
    prop = Property(
        seller_id=user.id,
        seller_email=user.email,
        title="Test Direct DB Insert",
        type=PropertyType.plot,
        status=PropertyStatus.available,
        approval=ApprovalType.dtcp,
        price=5000000.0,
        city="Chennai",
        state="Tamil Nadu",
        country="India",
        pincode="600001",
        seller_phone="9999999999",
        images=[],
        features=[],
    )
    db.add(prop)
    db.flush()
    print("FLUSH OK, id=", prop.id)
    db.commit()
    db.refresh(prop)
    print("COMMIT OK! Property ID:", prop.id)
    db.delete(prop)
    db.commit()
    print("Deleted test record")
except Exception:
    db.rollback()
    traceback.print_exc()
finally:
    db.close()
