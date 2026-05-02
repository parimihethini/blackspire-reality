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
            os.environ[key] = val


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
    DATABASE_URL: str = "postgresql://postgres:Hethu%40123@127.0.0.1:5432/blackspire"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Elasticsearch
    ELASTICSEARCH_URL: str = "http://localhost:9200"

    # Email Settings
    EMAIL_FROM: str = "blackspirereality@gmail.com"

    # CORS origins
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]

    # Rate limiting (requests/minute)
    RATE_LIMIT: str = "60/minute"

    class Config:
        _backend_root = Path(__file__).resolve().parents[2]
        env_file = str(_backend_root / ".env")
        extra = "ignore"


_backend_root = Path(__file__).resolve().parents[2]
_dotenv_path = _backend_root / ".env"
_force_load_dotenv(_dotenv_path)

settings = Settings()
