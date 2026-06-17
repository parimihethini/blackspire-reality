"""
Debug script for testing property publish via local API.
Credentials are read from environment variables — never hardcode them here.

Required env vars (add to backend/.env for local use):
    TEST_SELLER_EMAIL: your_seller@example.com
    TEST_SELLER_PASSWORD: your_password
"""
import os
import urllib.request
import json
import urllib.error
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env.example")

seller_email = os.environ.get("TEST_SELLER_EMAIL")
seller_password = os.environ.get("TEST_SELLER_PASSWORD")

if not seller_email or not seller_password:
    raise SystemExit(
        "ERROR: TEST_SELLER_EMAIL and TEST_SELLER_PASSWORD must be set in the environment.\n"
        "Add them to backend/.env — never hardcode credentials in source files."
    )

# Login first
data = json.dumps({"email": seller_email, "password": seller_password, "role": "seller"}).encode()
req = urllib.request.Request(
    "http://localhost:8000/auth/login",
    data=data,
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(req) as resp:
    result = json.loads(resp.read())
    token = result.get("access_token", "")

# Test with original 'plot' type only - get FULL error verbose
prop_data = json.dumps({
    "title": "Test Plot Property Debug",
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
    "http://localhost:8000/properties/",
    data=prop_data,
    headers={"Content-Type": "application/json", "Authorization": "Bearer " + token},
    method="POST",
)
try:
    with urllib.request.urlopen(prop_req) as presp:
        presult = json.loads(presp.read())
        print(f"SUCCESS! Property ID: {presult.get('id')}, Title: {presult.get('title')}")
except urllib.error.HTTPError as e:
    body = e.read().decode("utf-8", errors="replace")
    print(f"FAILED HTTP {e.code}:")
    print(f"Body: {body}")
    print(f"Headers: {dict(e.headers)}")
