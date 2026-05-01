from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import get_current_customer, get_current_admin
from app.models.investment import Investment
from app.models.property import Property
from app.models.user import User
from app.schemas.analytics import InvestmentCreate, InvestmentResponse
from app.ai.price_predictor import predict_price, city_tier

router = APIRouter()


@router.post("/", response_model=InvestmentResponse, status_code=201)
async def create_investment(
    data: InvestmentCreate,
    db: Session = Depends(get_db),
    investor: User = Depends(get_current_customer),
):
    prop = db.query(Property).filter(Property.id == data.property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    if data.equity_percentage <= 0 or data.equity_percentage > 100:
        raise HTTPException(status_code=400, detail="Equity percentage must be between 0 and 100")

    # Estimate ROI based on city tier
    tier = city_tier(prop.city)
    roi_map = {1: 20.0, 2: 15.0, 3: 10.0}
    expected_roi = roi_map.get(tier, 10.0)

    inv = Investment(
        investor_id=investor.id,
        property_id=data.property_id,
        amount=data.amount,
        equity_percentage=data.equity_percentage,
        expected_roi=expected_roi,
        notes=data.notes,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


@router.get("/my", response_model=List[InvestmentResponse])
async def my_investments(
    db: Session = Depends(get_db),
    investor: User = Depends(get_current_customer),
):
    return db.query(Investment).filter(Investment.investor_id == investor.id).all()


@router.get("/portfolio")
async def portfolio_summary(
    db: Session = Depends(get_db),
    investor: User = Depends(get_current_customer),
):
    investments = db.query(Investment).filter(Investment.investor_id == investor.id).all()

    if not investments:
        return {"holdings": [], "total_invested": 0, "total_equity": 0, "estimated_portfolio_value": 0}

    total_invested = sum(i.amount for i in investments)
    total_equity = sum(i.equity_percentage for i in investments)

    holdings = []
    for inv in investments:
        prop = db.query(Property).filter(Property.id == inv.property_id).first()
        if prop:
            holdings.append({
                "investment_id": inv.id,
                "property_title": prop.title,
                "city": prop.city,
                "invested_amount": inv.amount,
                "equity_pct": inv.equity_percentage,
                "current_price": prop.price,
                "expected_roi": inv.expected_roi,
                "status": inv.status,
            })

    estimated_value = sum(
        h["current_price"] * (h["equity_pct"] / 100)
        for h in holdings
    )

    return {
        "holdings": holdings,
        "total_invested": round(total_invested, 2),
        "total_equity": round(total_equity, 2),
        "estimated_portfolio_value": round(estimated_value, 2),
        "unrealized_gain": round(estimated_value - total_invested, 2),
    }
