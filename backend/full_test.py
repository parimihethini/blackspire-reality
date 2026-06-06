"""
Standalone test that avoids SQLAlchemy mapper conflicts by using raw psycopg2
to test DB inserts directly, and uses urllib to test the running API.

Set DATABASE_URL, TEST_LOGIN_EMAIL, and TEST_LOGIN_PASSWORD in the environment.
"""
import json
import os
import traceback
import urllib.error
import urllib.request

import psycopg2

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:5432/blackspire")
API_BASE = os.getenv("API_BASE", "http://localhost:8000")
TEST_EMAIL = os.getenv("TEST_LOGIN_EMAIL", "")
TEST_PASSWORD = os.getenv("TEST_LOGIN_PASSWORD", "")

if not TEST_EMAIL or not TEST_PASSWORD:
    raise SystemExit("Set TEST_LOGIN_EMAIL and TEST_LOGIN_PASSWORD environment variables.")

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
    (TEST_EMAIL,),
)
user_row = cur.fetchone()
if user_row:
    user_id, user_email, user_role, is_active, is_verified = user_row
    print(f"Seller: id={user_id}, role={user_role}, active={is_active}, verified={is_verified}")
else:
    print("ERROR: Test user not found in DB!")
    conn.close()
    raise SystemExit(1)

print("\n=== Step 2: Insert property directly with psycopg2 ===")
try:
    cur.execute(
        """
        INSERT INTO properties
        (seller_id, seller_email, title, type, status, approval, price, city, state, country, pincode, images, features, is_published, views, leads, is_verified)
        VALUES (%s, %s, %s, 'plot', 'Available', 'DTCP', 5000000, 'Chennai', 'Tamil Nadu', 'India', '600001', '[]', '[]', true, 0, 0, false)
        RETURNING id
        """,
        (user_id, user_email, "Raw DB Test Property"),
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    print(f"RAW DB INSERT SUCCESS! Property ID = {new_id}")

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
        {"email": TEST_EMAIL, "password": TEST_PASSWORD, "role": "seller"}
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

    prop_data = json.dumps(
        {
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
        }
    ).encode()

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
