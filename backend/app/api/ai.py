"""
AI router — memory-optimised version.

Changes from original:
  - Removed duplicate top-level imports (pickle, pandas, IsolationForest,
    cosine_similarity) — all AI logic now lives in the dedicated ai/* modules.
  - /fraud-check: removed per-request IsolationForest.fit(). Now delegates
    to fraud_detection.detect_fraud() which lazy-loads the pre-trained model
    once and reuses it across all requests.
  - /recommend: delegates to recommendation.recommend() (feature-based scoring).
  - /investment-score: caches the pkl model as a module-level singleton
    instead of calling pickle.load() on every request.
"""
import os
import uuid
import shutil
import pickle
import tempfile
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sklearn.metrics.pairwise import cosine_similarity

from app.db.session import get_db
from app.core.dependencies import get_any_user
from app.models.property import Property
from app.schemas.ai import (
    PricePredictionRequest, PricePredictionResponse,
    FraudCheckResponse, RecommendationResponse,
    DocumentVerificationResponse, InvestmentScoreResponse,
)
from app.ai.price_predictor import predict_price
from app.ai.fraud_detection import detect_fraud
from app.ai.recommendation import recommend
from app.ai.image_validation import validate_image
from app.services.ocr_service import extract_text_from_image
from app.services.gemini_parser import analyze_document

router = APIRouter()

# ── Investment model singleton ────────────────────────────────────────────────
# Loaded once on first use; avoids pickle.load() on every request.
_investment_model = None
_INVESTMENT_MODEL_PATH = (
    Path(__file__).resolve().parent.parent.parent / "ml_models" / "price_model.pkl"
)


def _get_investment_model():
    """Return the cached investment model, loading from disk if needed."""
    global _investment_model
    if _investment_model is None:
        if _INVESTMENT_MODEL_PATH.exists():
            try:
                with open(_INVESTMENT_MODEL_PATH, "rb") as f:
                    _investment_model = pickle.load(f)
                print(f"[AI] Investment model loaded from {_INVESTMENT_MODEL_PATH}")
            except Exception as e:
                print(f"[AI] Investment model load failed: {e}")
        else:
            print(f"[AI] Investment model not found at {_INVESTMENT_MODEL_PATH} — using fallback scoring")
    return _investment_model


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/predict-price", response_model=PricePredictionResponse)
async def ai_predict_price(
    data: PricePredictionRequest,
    _=Depends(get_any_user),
):
    result = predict_price(data.model_dump())
    return result


@router.get("/fraud-check/{property_id}", response_model=FraudCheckResponse)
async def ai_fraud_check(
    property_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_any_user),
):
    target = db.query(Property).filter(Property.id == property_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Property not found")

    # Build property dict for the pre-trained fraud model
    property_data = {
        "price":       float(target.price or 0),
        "city":        target.city or "",
        "type":        target.type or "house",
        "area":        target.area or "1000",
        "bedrooms":    target.bedrooms or 2,
        "bathrooms":   target.bathrooms or 1,
        "approval":    "Approved",
        "pincode":     getattr(target, "pincode", None),
        "seller_phone": getattr(target, "seller_phone", None),
    }

    # Delegate to pre-trained lazy-loaded IsolationForest — no per-request training
    result = detect_fraud(property_data)

    fraud_score = result.get("risk_score", 0.0)
    status = "suspicious" if not result.get("is_safe", True) else "safe"

    # Persist score
    target.fraud_score = fraud_score
    db.commit()

    return {
        "property_id": property_id,
        "fraud_score": round(fraud_score, 4),
        "status": status,
    }


@router.get("/recommend/{property_id}", response_model=RecommendationResponse)
async def ai_recommend(
    property_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_any_user),
):
    target = db.query(Property).filter(Property.id == property_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Property not found")

    candidates = (
        db.query(Property)
        .filter(Property.id != property_id, Property.is_published == True)
        .limit(200)   # cap to avoid loading entire DB into memory
        .all()
    )

    if not candidates:
        return {"recommended_properties": []}

    def _to_dict(p) -> dict:
        try:
            area = float(p.area) if p.area else 0.0
        except (ValueError, TypeError):
            area = 0.0
        return {
            "id":       p.id,
            "type":     p.type or "",
            "city":     p.city or "",
            "state":    getattr(p, "state", "") or "",
            "price":    float(p.price or 0),
            "area":     area,
            "bedrooms": float(p.bedrooms or 0),
            "bathrooms": float(p.bathrooms or 0),
        }

    target_dict     = _to_dict(target)
    candidate_dicts = [_to_dict(c) for c in candidates]

    result = recommend(target_dict, candidate_dicts, limit=5)

    recommended = [
        {
            "property_id":      int(p["id"]),
            "similarity_score": score,
        }
        for p, score in zip(result["properties"], result["similarity_scores"])
    ]

    return {"recommended_properties": recommended}


@router.post("/verify-document", response_model=DocumentVerificationResponse)
async def ai_verify_document(
    document_type: str = Form("deed"),
    file: UploadFile = File(...),
    _=Depends(get_any_user),
):
    """Document verification using pytesseract OCR + Gemini AI analysis."""
    temp_path: Optional[str] = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp:
            content = await file.read()
            if len(content) > 10 * 1024 * 1024:
                raise HTTPException(status_code=413, detail="File too large (max 10 MB)")
            tmp.write(content)
            temp_path = tmp.name

        text = extract_text_from_image(temp_path)

        if not text:
            return {
                "is_valid": False,
                "extracted_text": "",
                "confidence": 0.0,
                "fields_detected": {},
                "issues": ["OCR failed — no text extracted"],
                "compliance_status": "Error",
            }

        ai_result = analyze_document(text)
        success = ai_result.get("status") == "success"

        return {
            "is_valid":          success,
            "extracted_text":    text[:2000],
            "confidence":        0.85 if success else 0.0,
            "fields_detected":   ai_result.get("data", {}) if success else {},
            "issues":            [] if success else [ai_result.get("message", "Analysis failed")],
            "compliance_status": "Compliant" if success else "Error",
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Verification Error] {e}")
        return {
            "is_valid": False,
            "extracted_text": "",
            "confidence": 0.0,
            "fields_detected": {},
            "issues": [str(e)],
            "compliance_status": "Error",
        }
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                print(f"[Cleanup Error] {e}")


@router.post("/validate-image")
async def ai_validate_image(
    file: UploadFile = File(...),
    _=Depends(get_any_user),
):
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")
    return validate_image(content)


@router.get("/investment-score/{property_id}", response_model=InvestmentScoreResponse)
async def ai_investment_score(
    property_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_any_user),
):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    # ── 1. Price scoring using cached model singleton ─────────────────────────
    try:
        area       = float(prop.area or 0)
        bedrooms   = float(prop.bedrooms or 0)
        bathrooms  = float(prop.bathrooms or 0)
        actual_price = float(prop.price or 1)

        model = _get_investment_model()
        if model is not None:
            import pandas as pd
            input_df = pd.DataFrame([{
                "area": area, "bedrooms": bedrooms, "bathrooms": bathrooms
            }])
            predicted_price = float(model.predict(input_df)[0])
            ratio       = predicted_price / max(actual_price, 1.0)
            price_score = max(0.0, min(1.0, (ratio - 0.8) / 0.4))
        else:
            price_score = 0.5   # fallback when model file absent
    except Exception as e:
        print(f"[AI] Investment price scoring fallback: {e}")
        price_score = 0.5

    # ── 2. Safety score from fraud model ─────────────────────────────────────
    fraud_score  = prop.fraud_score if prop.fraud_score is not None else 0.0
    safety_score = 1.0 - fraud_score

    # ── 3. Composite score ────────────────────────────────────────────────────
    score    = (price_score * 0.6) + (safety_score * 0.4)
    category = "High" if score > 0.75 else ("Medium" if score >= 0.5 else "Low")

    prop.investment_score = score
    db.commit()

    return {
        "property_id":     prop.id,
        "investment_score": round(score, 4),
        "category":        category,
    }
