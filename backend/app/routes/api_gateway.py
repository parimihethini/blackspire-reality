from fastapi import APIRouter, Depends, HTTPException, status, Security
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db

router = APIRorg = APIRouter(prefix="/v1/gateway", tags=["Public & Private API Gateway"])

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

def verify_api_key(api_key: str = Security(api_key_header)):
    """
    Validates enterprise API keys for public/private endpoints.
    """
    # In production, query ApiKeyModel from database and verify hash
    expected_mock_key = "bs_live_secret_key_998877"
    if api_key != expected_mock_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired API Key provided."
        )
    return api_key

@router.get("/public/investors/query")
def public_api_investor_search(
    industry: Optional[str] = None,
    stage: Optional[str] = None,
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """
    Public API endpoint allowing external partners to search verified investors.
    Requires a valid 'X-API-Key' header.
    """
    return {
        "status": "success",
        "api_access": "authorized",
        "results": []
    }

@router.get("/private/ai-matching/sync")
def private_api_ai_matching_sync(
    startup_id: str,
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """
    Private enterprise API endpoint for CRM and AI matching engine synchronization.
    """
    return {
        "status": "success",
        "sync_status": "synchronized",
        "startup_id": startup_id,
        "matched_deals_synced": 12
    }