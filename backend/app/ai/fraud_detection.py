"""
Fraud / anomaly detection using IsolationForest trained on normal property features.
Rule-based checks are layered on top of the model score.
"""
import numpy as np
import joblib
from pathlib import Path
from typing import Dict, Any, List

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.ai.price_predictor import build_features, city_tier, parse_size

MODEL_DIR = Path(__file__).parent / "models"
MODEL_PATH = MODEL_DIR / "fraud_model.pkl"
SCALER_PATH = MODEL_DIR / "fraud_scaler.pkl"


def _generate_normal_data(n: int = 5000) -> np.ndarray:
    rng = np.random.default_rng(99)
    tiers = rng.integers(1, 4, n)
    sizes = rng.exponential(1500, n).clip(200, 12000)
    types = rng.integers(0, 6, n)
    approvals = rng.integers(1, 4, n)
    beds = rng.integers(1, 7, n)
    baths = rng.integers(1, 5, n)
    ages = rng.integers(0, 35, n)
    return np.column_stack([tiers, sizes, types, approvals, beds, baths, ages])


def _load_or_train():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    if MODEL_PATH.exists() and SCALER_PATH.exists():
        return joblib.load(MODEL_PATH), joblib.load(SCALER_PATH)

    print("[AI] Training fraud detection model…")
    X = _generate_normal_data()
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)
    model = IsolationForest(contamination=0.08, n_estimators=150, random_state=42)
    model.fit(Xs)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print("[AI] Fraud model saved.")
    return model, scaler


_model = None
_scaler = None


def _get():
    global _model, _scaler
    if _model is None:
        _model, _scaler = _load_or_train()
    return _model, _scaler


def detect_fraud(property_data: Dict[str, Any]) -> Dict[str, Any]:
    model, scaler = _get()
    features = build_features(property_data)
    Xs = scaler.transform(features)

    decision = float(model.decision_function(Xs)[0])
    prediction = int(model.predict(Xs)[0])  # -1 = anomaly

    # Map decision function to 0-1 risk (lower decision → higher risk)
    risk_score = float(np.clip(1 - (decision + 0.5) / 1.5, 0.0, 1.0))

    flags: List[str] = []
    price = float(property_data.get("price", 0))
    tier = city_tier(property_data.get("city", ""))

    if tier == 1 and price < 400_000:
        flags.append("Suspiciously low price for metro city")
    if tier == 3 and price > 150_000_000:
        flags.append("Unusually high price for tier-3 city")
    if not property_data.get("pincode"):
        flags.append("Missing pincode – location unverifiable")
    if not property_data.get("seller_phone"):
        flags.append("No seller contact information")
    if prediction == -1:
        flags.append("Property attributes are statistically anomalous")

    risk_score = min(risk_score + len(flags) * 0.08, 1.0)
    risk_level = "Low" if risk_score < 0.3 else ("Medium" if risk_score < 0.65 else "High")

    return {
        "is_safe": risk_score < 0.65,
        "risk_level": risk_level,
        "risk_score": round(risk_score, 3),
        "flags": flags,
        "recommendation": (
            "Verified – proceed with standard due diligence" if risk_score < 0.3
            else "Review documents carefully before investing" if risk_score < 0.65
            else "High risk – investigate thoroughly or avoid"
        ),
    }
