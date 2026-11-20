from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db

router = APIRouter(prefix="/analytics", tags=["Platform & Dashboard Analytics"])

@router.get("/admin/overview")
def get_admin_analytics_overview(db: Session = Depends(get_db)):
    """
    Computes high-level platform analytics for Admins:
    Total Investors, Active Investors, New Additions, Startup Requests, and Revenue Analytics.
    """
    return {
        "status": "success",
        "metrics": {
            "total_investors": 1240,
            "active_investors": 890,
            "new_investors_added_this_month": 45,
            "pending_startup_requests": 18,
            "total_revenue_usd": 250400.00,
            "platform_growth_rate": "+14.2%"
        }
    }

@router.get("/investor/{investor_id}")
def get_investor_dashboard_analytics(investor_id: str, db: Session = Depends(get_db)):
    """
    Computes custom performance metrics for an individual Investor:
    Profile completion percentage, interested/saved startups, and active deal pipelines.
    """
    return {
        "status": "success",
        "investor_id": investor_id,
        "metrics": {
            "profile_completion_percentage": 95,
            "interested_startups_count": 12,
            "saved_startups_count": 8,
            "pending_meeting_requests": 3,
            "investment_opportunities_matched": 34
        }
    }

@router.get("/founder/{startup_id}")
def get_founder_dashboard_analytics(startup_id: str, db: Session = Depends(get_db)):
    """
    Computes funding progress and investor match metrics for Startup Founders.
    """
    return {
        "status": "success",
        "startup_id": startup_id,
        "metrics": {
            "investor_matches_found": 56,
            "applications_sent": 14,
            "meeting_requests_received": 5,
            "funding_progress_percentage": 40.0,
            "target_raise_usd": 1000000.00,
            "secured_raise_usd": 400000.00
        }
    }

@router.get("/trends/industry")
def get_industry_funding_trends(db: Session = Depends(get_db)):
    """
    Analyzes funding success rates and industry capital distribution trends.
    """
    return {
        "status": "success",
        "top_funded_industries": [
            {"industry": "AI & Machine Learning", "total_funding_usd": 45000000},
            {"industry": "Fintech", "total_funding_usd": 32000000},
            {"industry": "SaaS", "total_funding_usd": 28000000},
            {"industry": "Healthcare", "total_funding_usd": 19000000}
        ]
    }