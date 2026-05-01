from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pickle
import pandas as pd
import os
import numpy as np

router = APIRouter()

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_PATH = BASE_DIR / "ml_models" / "price_model.pkl"

model = None
feature_columns = None

def load_model():
    global model, feature_columns
    try:
        print(f"[DEBUG] Attempting to load model from: {MODEL_PATH}")
        if not MODEL_PATH.exists():
            print(f"[ERROR] Model not found at {MODEL_PATH}")
            return
            
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
            
        # Extract expected feature names from the sklearn Pipeline's first step
        try:
            # For scikit-learn >= 1.0
            feature_columns = model['preprocessor'].feature_names_in_
        except AttributeError:
            # Fallback if old sklearn or not available
            pass
            
        print("Successfully loaded price prediction model.")
    except Exception as e:
        print(f"Failed to load model: {e}")

load_model()

class PredictRequest(BaseModel):
    area: float
    bedrooms: int
    bathrooms: int

class PredictResponse(BaseModel):
    predicted_price: float

@router.post("/predict-price", response_model=PredictResponse)
async def predict_price(data: PredictRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model is not loaded or unavailable on the server.")
        
    try:
        # Create a single row DataFrame with NaNs for all expected features (so the imputer can handle them)
        if feature_columns is not None:
            # Handle the complex Pipeline with 79 Kaggle features if it happens to be loaded
            input_df = pd.DataFrame(columns=feature_columns)
            input_df.loc[0] = np.nan
            if 'GrLivArea' in input_df.columns: input_df.loc[0, 'GrLivArea'] = data.area
            if 'BedroomAbvGr' in input_df.columns: input_df.loc[0, 'BedroomAbvGr'] = data.bedrooms
            if 'FullBath' in input_df.columns: input_df.loc[0, 'FullBath'] = data.bathrooms
        else:
            # Handle our custom straight 3-feature LinearRegression model correctly
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
        raise HTTPException(status_code=500, detail=f"Error making prediction: {str(e)}")
