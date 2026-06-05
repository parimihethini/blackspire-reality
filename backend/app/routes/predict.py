from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pickle
import pandas as pd
import os
import numpy as np
from pathlib import Path
from typing import Optional, Tuple

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_PATH = BASE_DIR / "ml_models" / "price_model.pkl"

_model: Optional[object] = None
_feature_columns: Optional[Tuple] = None


def _load_model() -> Tuple[Optional[object], Optional[Tuple]]:
    """Lazy-load the model only when first needed."""
    global _model, _feature_columns
    
    if _model is not None:
        return _model, _feature_columns
    
    try:
        if not MODEL_PATH.exists():
            print(f"[WARN] Model not found at {MODEL_PATH}")
            return None, None
            
        print(f"[AI] Loading price prediction model from {MODEL_PATH}…")
        with open(MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
            
        # Extract expected feature names from the sklearn Pipeline's first step
        try:
            # For scikit-learn >= 1.0
            _feature_columns = _model['preprocessor'].feature_names_in_
        except (AttributeError, KeyError, TypeError):
            # Fallback if old sklearn or not available
            _feature_columns = None
            
        print("[AI] Price prediction model loaded successfully.")
    except Exception as e:
        print(f"[ERROR] Failed to load price prediction model: {e}")
        _model = None
        _feature_columns = None
    
    return _model, _feature_columns


class PredictRequest(BaseModel):
    area: float
    bedrooms: int
    bathrooms: int


class PredictResponse(BaseModel):
    predicted_price: float


@router.post("/predict-price", response_model=PredictResponse)
async def predict_price(data: PredictRequest):
    """Predict property price using lazy-loaded ML model."""
    model, feature_columns = _load_model()
    
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not available. Please check server logs."
        )
        
    try:
        # Create a single row DataFrame with NaNs for all expected features
        if feature_columns is not None:
            # Handle complex Pipeline with multiple Kaggle features
            input_df = pd.DataFrame(columns=feature_columns)
            input_df.loc[0] = np.nan
            if 'GrLivArea' in input_df.columns:
                input_df.loc[0, 'GrLivArea'] = data.area
            if 'BedroomAbvGr' in input_df.columns:
                input_df.loc[0, 'BedroomAbvGr'] = data.bedrooms
            if 'FullBath' in input_df.columns:
                input_df.loc[0, 'FullBath'] = data.bathrooms
        else:
            # Handle custom 3-feature LinearRegression model
            input_df = pd.DataFrame([{
                'area': data.area,
                'bedrooms': data.bedrooms,
                'bathrooms': data.bathrooms
            }])

        # Make prediction
        prediction = model.predict(input_df)
        predicted_price = float(prediction[0])
        
        return PredictResponse(predicted_price=predicted_price)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
