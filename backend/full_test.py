"""
Test property publish via local API and direct DB insert.
Credentials are read from environment variables — never hardcode them here.

Required env vars (add to backend/.env for local use):
    TEST_SELLER_EMAIL: your_seller@example.com
    TEST_SELLER_PASSWORD: your_password
    DATABASE_URL: postgresql://user:pass@host:port/dbname
"""
import os
import urllib.request
import json
import urllib.error
import psycopg2
import traceback
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env.example")

DB_URL = os.environ.get("DATABASE_URL")
API_BASE = "http://localhost:8000"
seller_email = os.environ.get("TEST_SELLER_EMAIL")
seller_password = os.environ.get("TEST_SELLER_PASSWORD")

if not DB_URL:
    raise SystemExit("ERROR: DATABASE_URL must be set in the environment or backend/.env")
if not seller_email or not seller_password:
    raise SystemExit(
        "ERROR: TEST_SELLER_EMAIL and TEST_SELLER_PASSWORD must be set in the environment.\n"
        "Add them to backend/.env — never hardcode credentials in source files."
    )

print("=== Step 1: Check DB enum values ===")
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

cur.execute(
    "SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid "
    "WHERE t.typname = 'propertytype' ORDER BY e.enumsortorder"
)
ptypes = [r[0] for r in cur.fetchall()]
print("DB PropertyType:", ptypes)

cur.execute(
    "SELECT id, email, role, is_active, is_verified FROM users WHERE email = %s",
    (seller_email,),
)
user_row = cur.fetchone()
if user_row:
    user_id, user_email, user_role, is_active, is_verified = user_row
    print(f"Seller: id={user_id}, role={user_role}, active={is_active}, verified={is_verified}")
else:
    print("ERROR: Seller not found in DB!")
    conn.close()
    raise SystemExit(1)

print("\n=== Step 2: Insert property directly with psycopg2 ===")
try:
    cur.execute(
        """
        INSERT INTO properties
        (seller_id, seller_email, title, type, status, approval, price,
         city, state, country, pincode, images, features, is_published, views, leads, is_verified)
        VALUES (%s, %s, %s, 'plot', 'Available', 'DTCP', 5000000,
                'Chennai', 'Tamil Nadu', 'India', '600001', '[]', '[]', true, 0, 0, false)
        RETURNING id
        """,
        (user_id, user_email, "Raw DB Test Property"),
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    print(f"RAW DB INSERT SUCCESS! Property ID = {new_id}")

    # Cleanup
    cur.execute("DELETE FROM properties WHERE id = %s", (new_id,))
    conn.commit()
    print("Cleaned up test property")
except Exception:
    conn.rollback()
    print("RAW DB INSERT FAILED:")
    traceback.print_exc()
finally:
    cur.close()
    conn.close()

print("\n=== Step 3: Test API Login + Publish ===")
try:
    login_data = json.dumps(
        {"email": seller_email, "password": seller_password, "role": "seller"}
    ).encode()
    req = urllib.request.Request(
        f"{API_BASE}/auth/login",
        data=login_data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
        token = result.get("access_token", "")
        print(f"API Login OK. Token len={len(token)}")

    prop_data = json.dumps({
        "title": "API Test Property",
        "type": "plot",
        "status": "Available",
        "approval": "DTCP",
        "price": 5000000,
        "city": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "pincode": "600001",
        "seller_phone": "9999999999",
        "features": [],
        "images": [],
    }).encode()

    prop_req = urllib.request.Request(
        f"{API_BASE}/properties/",
        data=prop_data,
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + token},
        method="POST",
    )
    try:
        with urllib.request.urlopen(prop_req) as presp:
            presult = json.loads(presp.read())
            print(f"API PUBLISH SUCCESS! ID={presult.get('id')}")
            del_req = urllib.request.Request(
                f"{API_BASE}/properties/{presult['id']}",
                headers={"Authorization": "Bearer " + token},
                method="DELETE",
            )
            urllib.request.urlopen(del_req)
            print("Cleanup done")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"API PUBLISH FAILED: HTTP {e.code}")
        print(f"Response: {body}")
except Exception:
    traceback.print_exc()

print("\n=== DONE ===")
