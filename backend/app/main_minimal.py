"""Minimal FastAPI app for ultra-fast Render startup."""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import JSONResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Minimal lifespan - just startup and shutdown."""
    print("[Startup] Application startup complete [OK]")
    yield
    print("[Shutdown] Application shutdown complete [OK]")


# Create app with minimal startup
app = FastAPI(
    title="Blackspire PropTech API",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["Health"])
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Blackspire PropTech API", "version": "1.0.0"}


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


@app.middleware("http")
async def load_routers_middleware(request, call_next):
    """Load routers on first non-health request."""
    if request.url.path != "/health":
        await _load_routers_once()
    response = await call_next(request)
    return response
