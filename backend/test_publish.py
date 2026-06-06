"""Local-only login test — set TEST_LOGIN_EMAIL and TEST_LOGIN_PASSWORD in env."""
import json
import os
import urllib.request

email = os.getenv("TEST_LOGIN_EMAIL", "")
password = os.getenv("TEST_LOGIN_PASSWORD", "")
if not email or not password:
    raise SystemExit("Set TEST_LOGIN_EMAIL and TEST_LOGIN_PASSWORD environment variables.")

data = json.dumps({"email": email, "password": password, "role": "seller"}).encode()
req = urllib.request.Request(
    "http://127.0.0.1:8000/auth/login",
    data=data,
    headers={"Content-Type": "application/json"},
)
print(urllib.request.urlopen(req).read().decode())
