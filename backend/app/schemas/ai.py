from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class PricePredictionRequest(BaseModel):
    property_id: Optional[int] = None
    price: float
    size_sqft: Optional[float] = None
    size: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    city: Optional[str] = None
    state: Optional[str] = None
    type: Optional[str] = None
    age_years: Optional[int] = None
    approval: Optional[str] = None


class PricePredictionResponse(BaseModel):
    predicted_price: float
    confidence: float
    market_trend: str
    price_per_sqft: Optional[float]
    recommendation: str


class FraudCheckResponse(BaseModel):
    property_id: int
    fraud_score: float
    status: str


class RecommendedProperty(BaseModel):
    property_id: int
    similarity_score: float


class RecommendationResponse(BaseModel):
    recommended_properties: List[RecommendedProperty]


class DocumentVerificationResponse(BaseModel):
    is_valid: bool
    extracted_text: str
    confidence: float
    fields_detected: Dict[str, str]
    issues: List[str]
    compliance_status: str


class InvestmentScoreResponse(BaseModel):
    property_id: int
    investment_score: float
    category: str
