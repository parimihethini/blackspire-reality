from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class MarketAnalyticsResponse(BaseModel):
    total_active_listings: int
    average_price: float
    median_price: float
    price_growth_qoq: float
    top_cities: List[Dict[str, Any]]
    type_distribution: Dict[str, int]
    monthly_trends: List[Dict[str, Any]]


class PropertyInsightsResponse(BaseModel):
    property_id: int
    views: int
    leads: int
    price_vs_market_pct: float
    days_on_market: int
    roi_potential: float


class InvestmentCreate(BaseModel):
    property_id: int
    amount: float
    equity_percentage: float
    notes: Optional[str] = None


class InvestmentResponse(BaseModel):
    id: int
    investor_id: int
    property_id: int
    amount: float
    equity_percentage: float
    expected_roi: Optional[float]
    status: str
    notes: Optional[str]

    model_config = {"from_attributes": True}
