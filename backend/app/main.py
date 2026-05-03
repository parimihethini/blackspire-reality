from contextlib import asynccontextmanager
import os
from pathlib import Path

def _force_load_dotenv(dotenv_path: Path) -> None:
    """
    Minimal .env loader that ALWAYS overrides os.environ.
    Avoids relying on python-dotenv being installed in the venv.
    """
    try:
        raw = dotenv_path.read_text(encoding="utf-8")
    except Exception:
        # Silently fail if .env is missing; Railway uses direct environment variables.
        return

    for line in raw.splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if "=" not in s:
            continue
        k, v = s.split("=", 1)
        key = k.strip()
        val = v.strip().strip("'").strip('"')
        if key:
            # ONLY set if not already present in environment (standard behavior)
            os.environ.setdefault(key, val)

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Force-load backend/.env regardless of cwd (fixes stale inherited env vars).
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
_force_load_dotenv(ENV_PATH)
print("Loaded ENV from:", ENV_PATH)

from app.core.config import settings
from app.db.session import engine
from app.db.base import Base
from app.api import auth, users, properties, ai, analytics, investments, reviews, websockets, favorites, notifications, admin as admin_router, document_verification
from app.services.cache_service import cache
from app.services.search_service import search

# Ensure static upload directory exists before app mount.
os.makedirs("uploads", exist_ok=True)

# Import all models so SQLAlchemy creates them
import app.models.user        # noqa
import app.models.property    # noqa
import app.models.investment  # noqa
import app.models.review      # noqa
import app.models.favorite    # noqa


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
    # 1. Ensure basic tables exist
    Base.metadata.create_all(bind=engine)
    
    # 2. Manual migration safety check (Self-Healing)
    from sqlalchemy import inspect, text
    try:
        with engine.connect() as conn:
            inspector = inspect(engine)
            columns = [c['name'] for c in inspector.get_columns('users')]
            
            # Add missing columns if they don't exist
            if 'reset_otp_hash' not in columns:
                print("[Migration] Adding reset_otp_hash to users...")
                conn.execute(text("ALTER TABLE users ADD COLUMN reset_otp_hash VARCHAR(255)"))
            if 'reset_otp_expires_at' not in columns:
                print("[Migration] Adding reset_otp_expires_at to users...")
                conn.execute(text("ALTER TABLE users ADD COLUMN reset_otp_expires_at TIMESTAMP WITH TIME ZONE"))
            if 'reset_otp_attempts' not in columns:
                print("[Migration] Adding reset_otp_attempts to users...")
                conn.execute(text("ALTER TABLE users ADD COLUMN reset_otp_attempts INTEGER DEFAULT 0"))
            
            conn.commit()
            print("[Migration] Database schema check complete.")
    except Exception as e:
        print(f"[Migration] Error during manual schema check: {e}")

    await cache.connect()
    await search.connect()
    yield
    # ── Shutdown ──
    await cache.disconnect()
    await search.disconnect()


limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT])

app = FastAPI(
    title="Blackspire PropTech API",
    version="1.0.0",
    description=(
        "Production-ready real estate platform API with AI price prediction, "
        "fraud detection, document verification, and real-time WebSocket price streaming."
    ),
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc) or "Internal Server Error"},
    )

# Configure CORS origins via environment variable `FRONTEND_ORIGINS`
allowed = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,https://blackspire-reality.vercel.app",
)
allow_origins = [o.strip() for o in allowed.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,        prefix="/auth",        tags=["Authentication"])
app.include_router(users.router,       prefix="/users",       tags=["Users"])
app.include_router(properties.router,  prefix="/properties",  tags=["Properties"])
app.include_router(ai.router,          prefix="/ai",          tags=["AI Systems"])
app.include_router(analytics.router,   prefix="/analytics",   tags=["Analytics"])
app.include_router(investments.router, prefix="/investments",  tags=["Investments"])
app.include_router(favorites.router,   prefix="/favorites",    tags=["Favorites"])
app.include_router(reviews.router,     prefix="/reviews",      tags=["Reviews"])
app.include_router(websockets.router,  prefix="/ws",          tags=["WebSockets"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
app.include_router(document_verification.router, prefix="/verification", tags=["Document Verification"])
app.include_router(admin_router.router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy", "service": "Blackspire PropTech API", "version": "1.0.0"}
