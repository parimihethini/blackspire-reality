from contextlib import asynccontextmanager
import os
import asyncio
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

# Lazy import routers to avoid blocking at startup
def _load_routers():
    from app.api import auth, users, properties, ai, analytics, investments, reviews, websockets, favorites, notifications, admin as admin_router, document_verification
    return {
        'auth': auth.router,
        'users': users.router,
        'properties': properties.router,
        'ai': ai.router,
        'analytics': analytics.router,
        'investments': investments.router,
        'favorites': favorites.router,
        'reviews': reviews.router,
        'websockets': websockets.router,
        'notifications': notifications.router,
        'document_verification': document_verification.router,
        'admin': admin_router.router,
    }

from app.services.cache_service import cache
from app.services.search_service import search

# Import all models so SQLAlchemy creates them
import app.models.user        # noqa
import app.models.property    # noqa
import app.models.investment  # noqa
import app.models.review      # noqa
import app.models.favorite    # noqa

# Track if database has been initialized
_db_initialized = False

async def _initialize_database_if_needed():
    """Lazy database initialization on first request (non-blocking during startup)."""
    global _db_initialized
    if _db_initialized:
        return
    
    try:
        loop = asyncio.get_event_loop()
        await asyncio.wait_for(
            loop.run_in_executor(None, Base.metadata.create_all, engine),
            timeout=15.0
        )
        _db_initialized = True
        print("[DB] Database tables initialized on first request ✓")
    except asyncio.TimeoutError:
        print("[DB] Database initialization timed out")
    except Exception as e:
        print(f"[DB] Database initialization failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Minimal startup for ultra-fast port binding on Render."""
    print("[Startup] Application startup complete ✓")
    yield
    print("[Shutdown] Application shutdown complete ✓")


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
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code >= 400:
        print(f"[HTTP {exc.status_code}] {request.method} {request.url.path}: {exc.detail}")
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc) or "Internal Server Error"},
    )

# Configure CORS origins
# We combine settings from config.py and environment variable `FRONTEND_ORIGINS`
raw_origins = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,https://blackspire-reality.vercel.app",
)
allow_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

# Ensure all origins from settings are also included
for o in settings.ALLOWED_ORIGINS:
    if o not in allow_origins:
        allow_origins.append(o)

from slowapi.middleware import SlowAPIMiddleware

# IMPORTANT: In Starlette, middleware is executed in REVERSE registration order.
# So CORSMiddleware must be added LAST so it runs FIRST (outermost layer).
# This ensures CORS preflight (OPTIONS) requests are handled before rate limiting.
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight for 1 hour
)

# ── Explicit OPTIONS handler to ensure preflight never hits auth/rate-limiting ──
@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str, request: Request):
    """Handle all CORS preflight OPTIONS requests explicitly."""
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        },
    )

# ── Routers ───────────────────────────────────────────────────────────────────
# Load routers after app creation (lazy import to avoid blocking startup)
_routers = _load_routers()
app.include_router(_routers['auth'],                     prefix="/auth",            tags=["Authentication"])
app.include_router(_routers['users'],                    prefix="/users",           tags=["Users"])
app.include_router(_routers['properties'],               prefix="/properties",      tags=["Properties"])
app.include_router(_routers['ai'],                       prefix="/ai",              tags=["AI Systems"])
app.include_router(_routers['analytics'],                prefix="/analytics",       tags=["Analytics"])
app.include_router(_routers['investments'],              prefix="/investments",     tags=["Investments"])
app.include_router(_routers['favorites'],                prefix="/favorites",       tags=["Favorites"])
app.include_router(_routers['reviews'],                  prefix="/reviews",         tags=["Reviews"])
app.include_router(_routers['websockets'],               prefix="/ws",              tags=["WebSockets"])
app.include_router(_routers['notifications'],            prefix="/notifications",   tags=["Notifications"])
app.include_router(_routers['document_verification'],    prefix="/verification",    tags=["Document Verification"])
app.include_router(_routers['admin'])


@app.get("/health", tags=["Health"])
async def health():
    # Lazy-initialize database on first request
    await _initialize_database_if_needed()
    return {"status": "healthy", "service": "Blackspire PropTech API", "version": "1.0.0"}
