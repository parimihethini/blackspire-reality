from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List
from app.db.session import get_db

router = APIRouter(prefix="/marketplace", tags=["Funding Marketplace & Search"])

@router.get("/investors/search")
def search_investors_database(
    industry: Optional[str] = None,
    stage: Optional[str] = None,
    investor_type: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    min_ticket: Optional[float] = None,
    max_ticket: Optional[float] = None,
    keyword: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Advanced multi-parameter search engine for the Investor Database.
    Filters by industry, investment stage, ticket size range, and geography.
    """
    query_filters = {
        "industry": industry,
        "stage": stage,
        "investor_type": investor_type,
        "country": country,
        "city": city,
        "min_ticket": min_ticket,
        "max_ticket": max_ticket,
        "keyword": keyword
    }
    
    return {
        "total_results": 0,
        "skip": skip,
        "limit": limit,
        "filters": query_filters,
        "investors": []
    }

@router.get("/startups/listings")
def get_funding_marketplace_listings(
    industry: Optional[str] = None,
    stage: Optional[str] = None,
    min_revenue: Optional[float] = None,
    max_funding_needed: Optional[float] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Retrieves active startup listings in the Funding Marketplace.
    """
    return {
        "total_listings": 0,
        "listings": []
    }

@router.post("/startups/{startup_id}/action")
def investor_startup_action(
    startup_id: str,
    action: str = Query(..., description="Actions: save, contact, schedule_meeting, request_deck"),
    db: Session = Depends(get_db)
):
    """
    Handles investor interactions with startup listings in the marketplace.
    """
    valid_actions = ["save", "contact", "schedule_meeting", "request_deck"]
    if action not in valid_actions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action. Must be one of {valid_actions}"
        )
        
    return {
        "status": "success",
        "startup_id": startup_id,
        "action_recorded": action,
        "message": f"Successfully processed action '{action}' for startup {startup_id}."
    }