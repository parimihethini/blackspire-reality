from contextlib import asynccontextmanager
import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy.exc import SQLAlchemyError

# Force-load backend/.env regardless of cwd
def _force_load_dotenv(dotenv_path: Path) -> None:
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

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
_force_load_dotenv(ENV_PATH)
print("[Env] Loaded ENV from:", ENV_PATH)

from app.core.config import settings
from app.db.session import check_db_connection
from app.db.init_db import ensure_schema

# Track if database has been initialized
_db_initialized = False

async def _initialize_database_if_needed():
    """Ensure tables exist before handling DB-backed requests."""
    global _db_initialized
    if _db_initialized:
        return

    try:
        loop = asyncio.get_event_loop()
        await asyncio.wait_for(
            loop.run_in_executor(None, ensure_schema),
            timeout=60.0,
        )
        _db_initialized = True
        print("[DB] Database schema ready [OK]")
    except asyncio.TimeoutError:
        print("[DB] Database initialization timed out")
    except Exception as e:
        print(f"[DB] Database initialization failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database schema before accepting traffic."""
    await _initialize_database_if_needed()
    print("[Startup] Application startup complete [OK]")
    yield
    print("[Shutdown] Application shutdown complete [OK]")

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

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    print(f"[DB ERROR] {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=503,
        content={"detail": "Database temporarily unavailable. Please try again later."},
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    print(f"[ERROR] {request.method} {request.url.path}: {exc}")
    detail = str(exc) if settings.DEBUG else "Internal Server Error"
    return JSONResponse(
        status_code=500,
        content={"detail": detail},
    )

# CORS: explicit origins plus Vercel preview/production deployments.
allow_origins = list(dict.fromkeys(settings.ALLOWED_ORIGINS))

app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=r"https://([a-z0-9-]+\.)*vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "Blackspire PropTech API",
        "version": "1.0.0",
        "health": "/health",
        "docs": "/docs",
    }

@app.get("/health", tags=["Health"])
async def health():
    db_ok = check_db_connection()
    if db_ok:
        await _initialize_database_if_needed()
    status_code = 200 if db_ok else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if db_ok else "degraded",
            "database": "connected" if db_ok else "unavailable",
            "service": "Blackspire PropTech API",
            "version": "1.0.0",
        },
    )

# ── Lazy load all routers on first request ──
_routers_loaded = False

async def _load_routers_once():
    """Load all routers once on first API request."""
    global _routers_loaded
    if _routers_loaded:
        return
    
    print("[Routers] Loading all routers...")
    try:
        from app.api import (
            auth, users, properties, ai, analytics, investments, 
            reviews, websockets, favorites, notifications, admin as admin_router, 
            document_verification
        )
        
        # Import all models so SQLAlchemy maps them correctly.
        # IMPORTANT: must use 'from app.models import X' NOT 'import app.models.X'.
        # The dotted form 'import app.models.X' binds the bare name 'app' in this
        # function's local scope, shadowing the module-level FastAPI instance and
        # causing: AttributeError: module 'app' has no attribute 'include_router'
        from app.models import user as _m_user           # noqa
        from app.models import property as _m_property   # noqa
        from app.models import investment as _m_invest   # noqa
        from app.models import review as _m_review       # noqa
        from app.models import favorite as _m_favorite   # noqa
        
        app.include_router(auth.router,                     prefix="/auth",            tags=["Authentication"])
        app.include_router(users.router,                    prefix="/users",           tags=["Users"])
        app.include_router(properties.router,               prefix="/properties",      tags=["Properties"])
        app.include_router(ai.router,                       prefix="/ai",              tags=["AI Systems"])
        app.include_router(analytics.router,                prefix="/analytics",       tags=["Analytics"])
        app.include_router(investments.router,              prefix="/investments",     tags=["Investments"])
        app.include_router(favorites.router,                prefix="/favorites",       tags=["Favorites"])
        app.include_router(reviews.router,                  prefix="/reviews",         tags=["Reviews"])
        app.include_router(websockets.router,               prefix="/ws",              tags=["WebSockets"])
        app.include_router(notifications.router,            prefix="/notifications",   tags=["Notifications"])
        app.include_router(document_verification.router,    prefix="/verification",    tags=["Document Verification"])
        app.include_router(admin_router.router)
        
        print("[Routers] All routers loaded successfully [OK]")
        _routers_loaded = True
    except Exception as e:
        print(f"[Routers] ERROR loading routers: {e}")
        raise

# Paths that do not need the full API router tree loaded.
_SKIP_ROUTER_PATHS = {"/", "/health", "/docs", "/openapi.json", "/redoc", "/favicon.ico"}

@app.middleware("http")
async def load_routers_middleware(request, call_next):
    """Ensure schema + load routers before API requests."""
    if request.url.path not in _SKIP_ROUTER_PATHS:
        await _initialize_database_if_needed()
        await _load_routers_once()
    response = await call_next(request)
    return response
