"""
Geocoding via Nominatim (OpenStreetMap) — no API key required.
Gracefully falls back to pincode-only lookup when full address fails.
"""
from typing import Optional, Tuple

import httpx

_HEADERS = {"User-Agent": "Blackspire PropTech/1.0 (contact@blackspire.in)"}
_BASE = "https://nominatim.openstreetmap.org/search"


async def geocode(
    street: Optional[str] = None,
    area: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    country: str = "India",
    pincode: Optional[str] = None,
) -> Optional[Tuple[float, float]]:
    parts = [p for p in [street, area, city, state, pincode, country] if p]
    query = ", ".join(parts)

    async with httpx.AsyncClient(timeout=10.0) as client:
        for attempt_query in [query, f"{pincode}, {country}" if pincode else None]:
            if not attempt_query:
                continue
            try:
                resp = await client.get(
                    _BASE,
                    params={"q": attempt_query, "format": "json", "limit": 1},
                    headers=_HEADERS,
                )
                data = resp.json()
                if data:
                    return float(data[0]["lat"]), float(data[0]["lon"])
            except Exception as e:
                print(f"[Geocode] Error for '{attempt_query}': {e}")

    return None
