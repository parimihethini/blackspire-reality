"""Encode Gmail OAuth files for Render environment variables."""
import base64
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
CREDS = BACKEND_ROOT / "credentials.json"
TOKEN = BACKEND_ROOT / "token.pickle"


def _encode(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


def main() -> None:
    if not CREDS.exists():
        raise SystemExit(f"Missing {CREDS}. Download OAuth client JSON from Google Cloud.")
    if not TOKEN.exists():
        raise SystemExit(f"Missing {TOKEN}. Run: python generate_token.py")

    print("Add these to Render → Environment:\n")
    print(f"GOOGLE_CREDENTIALS_BASE64={_encode(CREDS)}")
    print(f"GOOGLE_TOKEN_BASE64={_encode(TOKEN)}")


if __name__ == "__main__":
    main()
