import redis.asyncio as aioredis
import json
import os
from typing import Any, Optional

from app.core.config import settings


class CacheService:
    def __init__(self):
        self._client: Optional[aioredis.Redis] = None

    async def connect(self):
        try:
            # Skip if URL is explicitly set to empty or placeholder
            if not settings.REDIS_URL or "localhost" in settings.REDIS_URL:
                # If we're on Railway but still using localhost, it's likely not configured
                if os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("PORT"):
                    print("[Cache] Redis not configured (using default localhost in production). Caching disabled.")
                    self._client = None
                    return

            self._client = await aioredis.from_url(
                settings.REDIS_URL, decode_responses=True
            )
            await self._client.ping()
            print("[Cache] Redis connected.")
        except Exception as e:
            print(f"[Cache] Redis unavailable (Connection Error): {e}")
            self._client = None

    async def disconnect(self):
        if self._client:
            await self._client.aclose()

    async def get(self, key: str) -> Optional[Any]:
        if not self._client:
            return None
        try:
            val = await self._client.get(key)
            return json.loads(val) if val else None
        except Exception:
            return None

    async def set(self, key: str, value: Any, ttl: int = 300):
        if not self._client:
            return
        try:
            await self._client.setex(key, ttl, json.dumps(value, default=str))
        except Exception:
            pass

    async def delete(self, key: str):
        if not self._client:
            return
        try:
            await self._client.delete(key)
        except Exception:
            pass

    async def delete_pattern(self, pattern: str):
        if not self._client:
            return
        try:
            async for key in self._client.scan_iter(match=pattern):
                await self._client.delete(key)
        except Exception:
            pass


cache = CacheService()
