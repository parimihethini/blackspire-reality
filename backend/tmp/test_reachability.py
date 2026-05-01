import requests
import json

def test_api():
    try:
        # Check health
        r = requests.get("http://127.0.0.1:8000/health")
        print(f"Health: {r.status_code}, {r.json()}")
        
        # Check docs
        r = requests.get("http://127.0.0.1:8000/docs")
        print(f"Docs: {r.status_code}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api()
