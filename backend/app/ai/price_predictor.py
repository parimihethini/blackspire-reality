"""
Real price prediction using GradientBoosting trained on synthetic-but-realistic
Indian real estate data. Model is persisted to disk after first training.
"""
import re
import numpy as np
import joblib
from pathlib import Path
from typing import Dict, Any, Optional

from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split

MODEL_DIR = Path(__file__).parent / "models"
MODEL_PATH = MODEL_DIR / "price_predictor.pkl"

CITY_TIER: Dict[str, int] = {
    "Mumbai": 1, "Delhi": 1, "Bangalore": 1, "Bengaluru": 1,
    "Chennai": 1, "Hyderabad": 1, "Kolkata": 1, "Pune": 2,
    "Ahmedabad": 2, "Jaipur": 2, "Surat": 2, "Lucknow": 2,
    "Coimbatore": 2, "Kochi": 2, "Indore": 2, "Nagpur": 2,
}

TYPE_IDX = {"plot": 0, "house": 1, "villa": 2, "apartment": 3, "commercial": 4, "investment": 5}
APPROVAL_IDX = {"Panchayat": 1, "Approved": 2, "BMRDA": 2, "CMDA": 3, "DTCP": 3}


def city_tier(city: str) -> int:
    return CITY_TIER.get(city, 3)


def parse_size(val: Any) -> float:
    if isinstance(val, (int, float)):
        return float(val) if val > 0 else 1000.0
    if isinstance(val, str):
        nums = re.findall(r"[\d.]+", val.replace(",", ""))
        return float(nums[0]) if nums else 1000.0
    return 1000.0


def build_features(d: Dict[str, Any]) -> np.ndarray:
    return np.array([[
        city_tier(d.get("city", "")),
        parse_size(d.get("size") or d.get("size_sqft", 1000)),
        TYPE_IDX.get(str(d.get("type", "house")).lower(), 1),
        APPROVAL_IDX.get(str(d.get("approval", "Approved")), 2),
        int(d.get("bedrooms") or 2),
        int(d.get("bathrooms") or 1),
        int(d.get("age_years") or 0),
    ]], dtype=float)


def _generate_training_data(n: int = 8000):
    rng = np.random.default_rng(42)
    tiers = rng.integers(1, 4, n)
    sizes = rng.exponential(1500, n).clip(200, 12000)
    types = rng.integers(0, 6, n)
    approvals = rng.integers(1, 4, n)
    beds = rng.integers(1, 7, n)
    baths = rng.integers(1, 5, n)
    ages = rng.integers(0, 35, n)

    base_ppsf = np.where(tiers == 1, 9000, np.where(tiers == 2, 5000, 2800))
    type_mult = np.select(
        [types == 0, types == 1, types == 2, types == 3, types >= 4],
        [0.65, 1.0, 1.7, 0.95, 1.35],
    )
    appr_mult = approvals * 0.15 + 0.55
    age_depr = 1 - ages * 0.009

    prices = (
        base_ppsf * sizes * type_mult * appr_mult * age_depr
        + beds * 250_000
        + baths * 120_000
        + rng.normal(0, 0.04, n) * base_ppsf * sizes
    ).clip(300_000, 600_000_000)

    X = np.column_stack([tiers, sizes, types, approvals, beds, baths, ages])
    return X, prices


def _load_or_train() -> GradientBoostingRegressor:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    if MODEL_PATH.exists():
        return joblib.load(MODEL_PATH)
    print("[AI] Training price prediction model…")
    X, y = _generate_training_data()
    model = GradientBoostingRegressor(
        n_estimators=300, max_depth=5, learning_rate=0.05,
        subsample=0.8, random_state=42,
    )
    model.fit(X, y)
    joblib.dump(model, MODEL_PATH)
    print("[AI] Price model saved.")
    return model


_model: Optional[GradientBoostingRegressor] = None


def get_model() -> GradientBoostingRegressor:
    global _model
    if _model is None:
        _model = _load_or_train()
    return _model


def predict_price(data: Dict[str, Any]) -> Dict[str, Any]:
    model = get_model()
    features = build_features(data)
    predicted = float(model.predict(features)[0])
    actual = float(data.get("price", predicted))

    completeness = sum(
        1 for k in ["size", "bedrooms", "bathrooms", "city", "type", "approval"]
        if data.get(k)
    )
    confidence = round(min(0.60 + completeness * 0.05, 0.96), 2)

    tier = city_tier(data.get("city", ""))
    trend = {1: "Strong Bullish", 2: "Bullish", 3: "Stable"}.get(tier, "Stable")

    size_sqft = parse_size(data.get("size") or data.get("size_sqft", 1000))
    ppsf = round(predicted / size_sqft, 2) if size_sqft > 0 else None

    diff_pct = round((predicted - actual) / actual * 100, 1) if actual > 0 else 0
    rec = (
        "Underpriced — strong buy opportunity" if diff_pct > 10
        else "Overpriced — negotiate before buying" if diff_pct < -10
        else "Fairly priced — aligned with market"
    )

    return {
        "predicted_price": round(predicted, 2),
        "confidence": confidence,
        "market_trend": trend,
        "price_per_sqft": ppsf,
        "recommendation": rec,
    }
