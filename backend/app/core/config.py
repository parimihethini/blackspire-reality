from pydantic_settings import BaseSettings
from typing import List
from pathlib import Path
import os

def _force_load_dotenv(dotenv_path: Path) -> None:
    """
    Minimal .env loader that ALWAYS overrides os.environ.
    Avoids relying on python-dotenv being installed in the venv.
    """
    try:
        raw = dotenv_path.read_text(encoding="utf-8")
    except Exception:
        return
    for line in raw.splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        key = k.strip()
        val = v.strip().strip("'").strip('"')
        if key:
            os.environ.setdefault(key, val)


class Settings(BaseSettings):
    APP_NAME: str = "Blackspire PropTech API"
    DEBUG: bool = False
    # When True, login logs hash preview and verify result (no plain password logged)
    AUTH_DEBUG: bool = False
    SECRET_KEY: str = "change-this-in-production-super-secret-key-32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # PostgreSQL
    DATABASE_URL: str = "postgresql://postgres:***REMOVED***@127.0.0.1:5432/blackspire"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Elasticsearch
    ELASTICSEARCH_URL: str = "http://localhost:9200"

    # Email Settings
    EMAIL_FROM: str = "blackspirereality@gmail.com"

    # OAuth (optional — set when enabling social login)
    GOOGLE_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""

    # First-admin bootstrap (optional — only when no admin exists yet)
    BOOTSTRAP_ADMIN_EMAIL: str = ""
    BOOTSTRAP_ADMIN_PASSWORD: str = ""
    BOOTSTRAP_ADMIN_NAME: str = "Platform Administrator"
    BOOTSTRAP_ADMIN_ROLE: str = "admin"  # admin | super_admin

    # CORS origins
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://blackspire-reality.vercel.app",
    ]

    # Rate limiting (requests/minute)
    RATE_LIMIT: str = "60/minute"

    def __init__(self, **values):
        super().__init__(**values)
        if self.DATABASE_URL.startswith("postgres://"):
            self.DATABASE_URL = self.DATABASE_URL.replace(
                "postgres://", "postgresql://", 1
            )

        # Merge FRONTEND_ORIGINS (comma-separated) into ALLOWED_ORIGINS for production CORS.
        raw_frontend = os.getenv("FRONTEND_ORIGINS", "")
        if raw_frontend:
            for origin in raw_frontend.split(","):
                origin = origin.strip()
                if origin and origin not in self.ALLOWED_ORIGINS:
                    self.ALLOWED_ORIGINS.append(origin)

        self._validate_database_url()

    def _validate_database_url(self) -> None:
        """Log clear warnings for common Supabase misconfiguration."""
        from urllib.parse import urlparse

        parsed = urlparse(self.DATABASE_URL)
        username = parsed.username or ""
        if username.count(".") >= 2 and username.startswith("postgres."):
            print(
                "[DB] WARNING: DATABASE_URL username looks malformed "
                f"({username}). Use the exact connection string from Supabase "
                "(Settings → Database → Connection string). Do not append extra project refs."
            )

    class Config:
        _backend_root = Path(__file__).resolve().parents[2]
        env_file = str(_backend_root / ".env")
        extra = "ignore"


_backend_root = Path(__file__).resolve().parents[2]
_dotenv_path = _backend_root / ".env"
_force_load_dotenv(_dotenv_path)

settings = Settings()
