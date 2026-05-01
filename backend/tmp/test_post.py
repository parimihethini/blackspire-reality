import requests

def test_visit_request():
    payload = {
        "property_id": 1,
        "name": "Test User",
        "email": "test@example.com",
        "phone": "1234567890",
        "date": "2026-04-05",
        "time": "10:00",
        "message": "Test message"
    }
    try:
        # Note: This will fail with 401 because no token, but it should NOT be "Failed to fetch" (network error)
        r = requests.post("http://127.0.0.1:8000/properties/visit/request", json=payload)
        print(f"Status: {r.status_code}, Response: {r.text}")
    except Exception as e:
        print(f"Network Error: {e}")

if __name__ == "__main__":
    test_visit_request()
