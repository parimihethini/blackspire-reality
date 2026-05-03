from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import numpy as np
import pandas as pd
import pickle
from pathlib import Path
from sklearn.ensemble import IsolationForest
from sklearn.metrics.pairwise import cosine_similarity
import os
import uuid
import shutil

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

    # Fetch active properties to build an environmental dataset dynamically
    all_properties = db.query(Property).filter(Property.is_published == True).all()

    # Fallback to safe if the dataset is too small for meaningful anomaly detection
    if len(all_properties) < 5:
        return {
            "property_id": property_id,
            "fraud_score": 0.0,
            "status": "safe"
        }


    def extract_fraud_features(p):
        try:
            area = float(p.area) if p.area else 0.0
        except ValueError:
            area = 0.0
        bedrooms = float(p.bedrooms) if p.bedrooms else 0.0
        bathrooms = float(p.bathrooms) if p.bathrooms else 0.0
        price = float(p.price) if p.price else 0.0
        return [area, bedrooms, bathrooms, price]

    # Convert properties to numerical feature matrix
    feature_matrix = np.array([extract_fraud_features(p) for p in all_properties])
    target_vector = np.array([extract_fraud_features(target)])

    # Initialize and train Isolation Forest on-the-fly dynamically
    # contamination=0.1 means we assume 10% of our database could be suspicious/fraudulent outliers
    model = IsolationForest(contamination=0.1, random_state=42)
    model.fit(feature_matrix)

    # Scikit-learn predictions output explicitly: -1 for outliers (suspicious) and 1 for normal (safe).
    prediction = model.predict(target_vector)[0]
    
    # ML Anomaly scores: score_samples ranges ~ [-1.0, 0.5] where lower = more anomalous
    raw_score = model.score_samples(target_vector)[0]
    
    # Scale ML score to a clean 0.0 to 1.0 likelihood scale for our response/database
    fraud_score = max(0.0, min(1.0, float(abs(raw_score))))
    status = "suspicious" if prediction == -1 else "safe"

    # Persist our newly computed real-time ML fraud score back to the database safely
    target.fraud_score = fraud_score
    db.commit()

    return {
        "property_id": property_id,
        "fraud_score": round(fraud_score, 4),
        "status": status
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
        .all()
    )

    if not candidates:
        return {"recommended_properties": []}


    def extract_features(p):
        try:
            # Safely handle potential parsing errors in text-based area fields from forms
            area = float(p.area) if p.area else 0.0
        except ValueError:
            area = 0.0
        bedrooms = float(p.bedrooms) if p.bedrooms else 0.0
        bathrooms = float(p.bathrooms) if p.bathrooms else 0.0
        price = float(p.price) if p.price else 0.0
        return [area, bedrooms, bathrooms, price]

    # Target vector representing the focal property
    target_vector = np.array([extract_features(target)])
    
    # Feature matrix for the potential candidates 
    candidate_matrix = np.array([extract_features(c) for c in candidates])

    # Compute Euclidean Cosine Similarity 
    similarities = cosine_similarity(target_vector, candidate_matrix)[0]

    # Extract the top 5 closest match indices
    top_indices = np.argsort(similarities)[::-1][:5]

    recommended = []
    for idx in top_indices:
        recommended.append({
            "property_id": int(candidates[idx].id),
            "similarity_score": round(float(similarities[idx]), 4)
        })

    return {"recommended_properties": recommended}


@router.post("/verify-document", response_model=DocumentVerificationResponse)
async def ai_verify_document(
    document_type: str = Form("deed"),
    file: UploadFile = File(...),
    _=Depends(get_any_user),
):
    """
    Production-grade document verification using pytesseract and Gemini AI.
    """
    try:
        # Save uploaded file to a temporary location using system temp dir
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp:
            content = await file.read()
            if len(content) > 10 * 1024 * 1024:
                raise HTTPException(status_code=413, detail="File too large (max 10 MB)")
            tmp.write(content)
            temp_path = tmp.name
            
        # Run OCR -> get text
        text = extract_text_from_image(temp_path)
        
        if not text:
            return {
                "is_valid": False,
                "extracted_text": "",
                "confidence": 0.0,
                "fields_detected": {},
                "issues": ["OCR failed"],
                "compliance_status": "Error",
            }
            
        # Run AI Analysis
        ai_result = analyze_document(text)
        
        return {
            "is_valid": ai_result.get("status") == "success",
            "extracted_text": text[:2000],
            "confidence": 0.85 if ai_result.get("status") == "success" else 0.0,
            "fields_detected": ai_result.get("data", {}) if ai_result.get("status") == "success" else {},
            "issues": [] if ai_result.get("status") == "success" else [ai_result.get("message", "Analysis failed")],
            "compliance_status": "Compliant" if ai_result.get("status") == "success" else "Error",
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
        # Cleanup
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                print(f"[Cleanup Error] Could not remove {temp_path}: {e}")


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


    # 1. Dynamic Prediction Scoring directly connected to LinearRegression Model
    try:
        BASE_DIR = Path(__file__).resolve().parent.parent.parent
        MODEL_PATH = BASE_DIR / "ml_models" / "price_model.pkl"

        area = float(prop.area) if prop.area else 0.0
        bedrooms = float(prop.bedrooms) if prop.bedrooms else 0.0
        bathrooms = float(prop.bathrooms) if prop.bathrooms else 0.0
        actual_price = float(prop.price) if prop.price else 1.0

        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)

        input_df = pd.DataFrame([{
            'area': area,
            'bedrooms': bedrooms,
            'bathrooms': bathrooms
        }])

        predicted_price = float(model.predict(input_df)[0])

        # Mathematical Ratio: predicted_price > actual_price = highly lucrative investment
        ratio = predicted_price / max(actual_price, 1.0)
        
        # Safely constrain evaluation linearly capping optimally above 1.2x (highly undervalued) and mapping poorly below 0.8x
        price_score = max(0.0, min(1.0, (ratio - 0.8) / 0.4))
    except Exception as e:
        print(f"Investment Price Core Evaluator fallback triggered: {e}")
        price_score = 0.5 

    # 2. Risk & Safety Profile seamlessly attached evaluating real IsolationForest anomaly results
    fraud_score = prop.fraud_score if prop.fraud_score is not None else 0.0
    safety_score = 1.0 - fraud_score  # Invert: low anomaly -> high intrinsic safety natively

    # 3. Composite Algorithmic Normalization specifically weighting 60/40 globally
    score = (price_score * 0.6) + (safety_score * 0.4)

    # 4. Strict Categorization Labeling mechanism
    if score > 0.75:
        category = "High"
    elif score >= 0.5:
        category = "Medium"
    else:
        category = "Low"

    # Persist natively intelligently into SQL DB cache structures
    prop.investment_score = score
    db.commit()

    return {
        "property_id": prop.id,
        "investment_score": round(score, 4),
        "category": category
    }
