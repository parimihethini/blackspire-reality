
import os
import uuid
import shutil
from fastapi import APIRouter, File, UploadFile, HTTPException
from app.services.file_parser import extract_text
from app.services.ai_parser import analyze_document

router = APIRouter()

@router.post("/verify-document")
async def verify_document(file: UploadFile = File(...)):
    """
    Production-grade document verification using pytesseract and Gemini AI.
    """
    try:
        # 1. Extract text from uploaded file (supports txt, pdf, images)
        text = await extract_text(file)

        if not text or len(text.strip()) == 0:
            return {"status": "failed", "message": "Text extraction failed"}

        # 2. Run AI Analysis
        ai_result = analyze_document(text)

        if not isinstance(ai_result, dict) or ai_result.get("status") != "success":
            return {"status": "failed", "message": ai_result.get("message", "AI analysis failed")}

        return {"status": "success", "raw_text": text[:2000], "analysis": ai_result.get("data")}

    except Exception as e:
        print(f"[Verification Error] {e}")
        return {"status": "failed", "message": str(e)}
