
import os
import uuid
import shutil
from fastapi import APIRouter, File, UploadFile, HTTPException
from app.services.ocr_service import extract_text_from_image
from app.services.validation_service import validate_document_text
from app.services.extraction_service import extract_fields
from app.services.scoring_service import calculate_confidence, assess_fraud_risk
from app.services.ai_service import generate_document_summary

router = APIRouter()

TEMP_DIR = "temp_docs"
os.makedirs(TEMP_DIR, exist_ok=True)

@router.post("/verify-document")
async def verify_document(file: UploadFile = File(...)):
    """
    Endpoint to verify property documents using OCR and validation pipeline.
    """
    temp_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}_{file.filename}")
    
    try:
        # 1. Save uploaded file temporarily
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Run OCR -> get text
        text = extract_text_from_image(temp_path)
        
        # 3. Run validation
        is_valid, match_count = validate_document_text(text)
        
        if not is_valid:
            return {
                "status": "invalid",
                "message": "Document not verifiable. Keywords missing.",
                "confidence": 10,
                "fraud_risk": "HIGH",
                "extracted_data": None,
                "summary": "This document does not contain the required property registration identifiers."
            }
            
        # 4. If valid: Extract fields, Calculate confidence, Calculate fraud risk, Generate summary
        extracted_data = extract_fields(text)
        confidence = calculate_confidence(match_count, extracted_data)
        fraud_risk = assess_fraud_risk(extracted_data, is_valid)
        summary = generate_document_summary(extracted_data, is_valid)
        
        return {
            "status": "valid",
            "message": "Document processed successfully",
            "confidence": confidence,
            "fraud_risk": fraud_risk,
            "extracted_data": extracted_data,
            "summary": summary
        }
        
    except Exception as e:
        print(f"[Verification Error] {e}")
        return {
            "status": "error",
            "message": "Processing failed safely"
        }
    finally:
        # 5. Cleanup: Delete temp files after processing
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                print(f"[Cleanup Error] Could not remove {temp_path}: {e}")
