from typing import List

import numpy as np
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import get_any_user, get_current_admin
from app.models.property import Property
from app.schemas.analytics import MarketAnalyticsResponse, PropertyInsightsResponse

router = APIRouter()


@router.get("/market", response_model=MarketAnalyticsResponse)
async def market_analytics(
    db: Session = Depends(get_db),
    _=Depends(get_any_user),
):
    props = db.query(Property).filter(Property.is_published == True).all()

    if not props:
        return {
            "total_active_listings": 0,
            "average_price": 0, "median_price": 0,
            "price_growth_qoq": 0,
            "top_cities": [], "type_distribution": {}, "monthly_trends": [],
        }

    prices = np.array([p.price for p in props], dtype=float)
    avg_price = float(np.mean(prices))
    median_price = float(np.median(prices))

    # City breakdown
    from collections import Counter
    city_counts: Counter = Counter(p.city for p in props)
    city_prices: dict = {}
    for p in props:
        city_prices.setdefault(p.city, []).append(p.price)

    top_cities = sorted(
        [
            {
                "city": c,
                "listings": cnt,
                "avg_price": round(float(np.mean(city_prices[c])), 2),
            }
            for c, cnt in city_counts.most_common(8)
        ],
        key=lambda x: x["listings"],
        reverse=True,
    )

    type_dist = dict(Counter(p.type.value if p.type else "other" for p in props))

    # Monthly trend (last 6 months based on created_at)
    from datetime import datetime, timedelta
    monthly: dict = {}
    for p in props:
        if p.created_at:
            key = p.created_at.strftime("%Y-%m")
            monthly.setdefault(key, []).append(p.price)

    monthly_trends = sorted(
        [{"month": k, "listings": len(v), "avg_price": round(float(np.mean(v)), 2)}
         for k, v in monthly.items()],
        key=lambda x: x["month"],
    )[-6:]

    # QoQ growth estimate from oldest vs newest half
    price_growth = 0.0
    if len(prices) >= 4:
        mid = len(prices) // 2
        old_avg = float(np.mean(prices[:mid]))
        new_avg = float(np.mean(prices[mid:]))
        price_growth = round((new_avg - old_avg) / old_avg * 100, 2) if old_avg > 0 else 0.0

    return {
        "total_active_listings": len(props),
        "average_price": round(avg_price, 2),
        "median_price": round(median_price, 2),
        "price_growth_qoq": price_growth,
        "top_cities": top_cities,
        "type_distribution": type_dist,
        "monthly_trends": monthly_trends,
    }


@router.get("/property/{property_id}", response_model=PropertyInsightsResponse)
async def property_insights(
    property_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_any_user),
):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Property not found")

    # Compare vs same-city properties
    similar = db.query(Property).filter(
        Property.city == prop.city,
        Property.type == prop.type,
        Property.id != prop.id,
        Property.is_published == True,
    ).all()

    market_avg = float(np.mean([p.price for p in similar])) if similar else prop.price
    price_vs_market = round((prop.price - market_avg) / market_avg * 100, 2) if market_avg else 0.0

    # Days on market
    from datetime import datetime, timezone
    created = prop.created_at
    if created:
        if created.tzinfo:
            days = (datetime.now(timezone.utc) - created).days
        else:
            days = (datetime.utcnow() - created).days
    else:
        days = 0

    roi_potential = max(5.0, 25.0 - abs(price_vs_market) * 0.3)

    return {
        "property_id": prop.id,
        "views": prop.views or 0,
        "leads": prop.leads or 0,
        "price_vs_market_pct": price_vs_market,
        "days_on_market": days,
        "roi_potential": round(roi_potential, 2),
    }
