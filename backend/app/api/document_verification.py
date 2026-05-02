
import os
import uuid
import shutil
from fastapi import APIRouter, File, UploadFile, HTTPException
from app.services.ocr_service import extract_text_from_image
from app.services.ai_parser import analyze_document

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/verify-document")
async def verify_document(file: UploadFile = File(...)):
    """
    Upgraded production-grade document verification using EasyOCR and GPT-4o-mini.
    """
    temp_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_{file.filename}")
    
    try:
        # 1. Save uploaded file temporarily
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Run OCR -> get text
        text = extract_text_from_image(temp_path)
        
        if not text:
            return {
                "status": "failed",
                "message": "Unable to extract text from the document image.",
                "analysis": None
            }
            
        # 3. Run AI Analysis
        ai_result = analyze_document(text)
        
        if isinstance(ai_result, dict) and "error" in ai_result:
            return {
                "status": "failed",
                "message": "Analysis failed",
                "error": ai_result["error"]
            }
            
        return {
            "status": "success",
            "raw_text": text[:500],
            "analysis": ai_result
        }
        
    except Exception as e:
        print(f"[Verification Error] {e}")
        return {
            "status": "error",
            "message": f"Processing failed safely: {str(e)}"
        }
    finally:
        # 4. Cleanup
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                print(f"[Cleanup Error] Could not remove {temp_path}: {e}")
