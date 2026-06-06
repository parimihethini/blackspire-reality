"""
Gemini AI document parser — lazy client initialisation.

Changes from original:
  - `genai.Client()` is NO longer created at module import time.
  - A `_get_client()` lazy getter initialises the gRPC channel on the
    first actual document analysis request, not at router load time.
  - This defers ~30–50 MB of gRPC/protobuf memory until it is actually needed.
  - Legacy wrapper `analyze_document_gemini` retained for backward compatibility.
"""
import os
import json
import logging
from typing import Optional

from google import genai

logger = logging.getLogger(__name__)

# ── Lazy Gemini client ────────────────────────────────────────────────────────
_client: Optional[genai.Client] = None
_client_init_attempted: bool = False


def _get_client() -> Optional[genai.Client]:
    """
    Return a cached Gemini client, initialising it on first call.

    Returns None (and logs a warning) if GEMINI_API_KEY is missing or if
    initialisation fails.
    """
    global _client, _client_init_attempted
    if _client_init_attempted:
        return _client  # Return cached result (even if None)

    _client_init_attempted = True
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        print("[Gemini] GEMINI_API_KEY not set — document analysis disabled")
        return None

    try:
        _client = genai.Client(api_key=api_key)
        print("[Gemini] Client initialized (lazy, on first use)")
    except Exception as e:
        logger.error(f"[Gemini] Client initialization failed: {e}")
        _client = None

    return _client


# ── Public API ────────────────────────────────────────────────────────────────

def analyze_document(text: str) -> dict:
    """
    Use Google Gemini Flash to extract structured fields from OCR text.

    Returns:
        {"status": "success", "data": {...}}   on success
        {"status": "failed",  "message": "..."} on error
    """
    client = _get_client()
    if not client:
        return {"status": "failed", "message": "Missing GEMINI_API_KEY"}

    if not text or len(text) < 20:
        return {"status": "failed", "message": "No meaningful text extracted"}

    prompt = f"""Extract structured details from this legal document text:

{text}

Return JSON only with exactly these keys:
{{
  "document_type": "",
  "owner": "",
  "location": "",
  "registration_number": "",
  "legal_status": "",
  "risk_level": ""
}}
"""
    try:
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=prompt,
        )
        try:
            result = json.loads(response.text)
            return {"status": "success", "data": result}
        except json.JSONDecodeError:
            return {"status": "success", "data": {"raw_response": response.text}}
    except Exception as e:
        logger.error(f"[Gemini] Analysis error: {e}")
        return {"status": "failed", "message": str(e)}


def analyze_document_gemini(text: str) -> dict:
    """Legacy wrapper — kept for backward compatibility."""
    client = _get_client()
    if not client:
        return {"status": "failed", "message": "Missing GEMINI_API_KEY"}

    if not text or len(text) < 20:
        return {"status": "failed", "message": "No meaningful text extracted"}

    prompt = f"""Extract key legal document details from this text:

{text}

Return JSON with exactly these keys:
- document_type
- owner
- location
- registration_number
- legal_status (clear/unclear)
- risk_level (low/medium/high)
"""
    try:
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=prompt,
        )
        result = json.loads(response.text)
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"[Gemini] Legacy analysis error: {e}")
        return {"status": "failed", "message": str(e)}
