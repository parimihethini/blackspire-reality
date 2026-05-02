
"""
Document verification using pytesseract + Pillow.
Extracts text, detects legal keywords, and assesses compliance.
Removed OpenCV to prevent libGL.so.1 errors on Railway.
"""
import io
import re
from typing import Dict, Any, List
import logging

try:
    import pytesseract
    from PIL import Image, ImageOps, ImageFilter
    import numpy as np
    _OCR_AVAILABLE = True
except ImportError:
    _OCR_AVAILABLE = False

LEGAL_KEYWORDS = [
    "registration", "deed", "survey", "patta", "khata", "title", "sale",
    "property", "plot", "schedule", "boundaries", "ownership", "transferee",
    "vendor", "vendee", "rupees", "stamp duty", "notary", "encumbrance",
]
COMPLIANCE_KEYWORDS = ["dtcp", "cmda", "bmrda", "approval", "sanctioned", "layout", "approved"]


def _preprocess(image_bytes: bytes) -> Image.Image:
    """
    Preprocess image using Pillow instead of OpenCV.
    """
    img = Image.open(io.BytesIO(image_bytes))
    # Convert to grayscale
    gray = ImageOps.grayscale(img)
    # Increase contrast
    gray = ImageOps.autocontrast(gray)
    # Slight sharpen
    gray = gray.filter(ImageFilter.SHARPEN)
    return gray


def _extract_fields(text: str) -> Dict[str, str]:
    fields: Dict[str, str] = {}
    t = text.lower()

    # Price / amount
    amounts = re.findall(r"(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d+)?)\s*(?:rupees|/-)?", t)
    if amounts:
        fields["amount"] = amounts[0].replace(",", "")

    # Survey / plot number
    survey = re.search(r"survey\s*no\.?\s*(\w+)", t)
    if survey:
        fields["survey_no"] = survey.group(1)

    # Registration number
    reg = re.search(r"(?:reg(?:istration)?\.?\s*no\.?|doc\.?\s*no\.?)\s*(\w+)", t)
    if reg:
        fields["registration_no"] = reg.group(1)

    # Date
    dates = re.findall(r"\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b", text)
    if dates:
        fields["date"] = dates[0]

    return fields


def verify_document(file_bytes: bytes, document_type: str) -> Dict[str, Any]:
    issues: List[str] = []

    if not _OCR_AVAILABLE:
        return {
            "is_valid": False,
            "extracted_text": "",
            "confidence": 0.0,
            "fields_detected": {},
            "issues": ["OCR libraries (pytesseract, Pillow) not installed"],
            "compliance_status": "Unverifiable",
        }

    try:
        processed_img = _preprocess(file_bytes)
        raw_text = pytesseract.image_to_string(processed_img, lang="eng")
        
        # Get confidence levels
        data = pytesseract.image_to_data(processed_img, output_type=pytesseract.Output.DICT)
        confidences = [int(c) for c in data["conf"] if str(c).isdigit() and int(c) > 0]
        avg_conf = sum(confidences) / len(confidences) / 100 if confidences else 0.0
    except Exception as e:
        logging.error(f"OCR processing error: {e}")
        issues.append(f"OCR processing error: {str(e)}")
        return {
            "is_valid": False,
            "extracted_text": "",
            "confidence": 0.0,
            "fields_detected": {},
            "issues": issues,
            "compliance_status": "Error",
        }

    tl = raw_text.lower()
    legal_found = sum(1 for kw in LEGAL_KEYWORDS if kw in tl)
    compliance_found = any(kw in tl for kw in COMPLIANCE_KEYWORDS)

    if legal_found < 2:
        issues.append("Insufficient legal terminology detected – may not be a valid property document")
    if avg_conf < 0.4:
        issues.append("Low OCR confidence – document image quality is poor")

    fields = _extract_fields(raw_text)
    is_valid = legal_found >= 2 and avg_conf >= 0.4 and len(issues) == 0
    compliance = "Compliant" if compliance_found else ("Pending" if is_valid else "Non-Compliant")

    return {
        "is_valid": is_valid,
        "extracted_text": raw_text[:2000],
        "confidence": round(avg_conf, 3),
        "fields_detected": fields,
        "issues": issues,
        "compliance_status": compliance,
    }
