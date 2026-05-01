"""
Document verification using pytesseract + OpenCV.
Extracts text, detects legal keywords, and assesses compliance.
"""
import io
import re
from typing import Dict, Any, List

try:
    import pytesseract
    from PIL import Image
    import cv2
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


def _preprocess(image_bytes: bytes) -> "np.ndarray":
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.fastNlMeansDenoising(gray, h=10)
    processed = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2,
    )
    return processed


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
            "issues": ["OCR libraries (pytesseract, opencv-python, Pillow) not installed"],
            "compliance_status": "Unverifiable",
        }

    try:
        processed = _preprocess(file_bytes)
        pil_img = Image.fromarray(processed)
        raw_text = pytesseract.image_to_string(pil_img, lang="eng")
        data = pytesseract.image_to_data(pil_img, output_type=pytesseract.Output.DICT)
        confidences = [int(c) for c in data["conf"] if str(c).isdigit() and int(c) > 0]
        avg_conf = sum(confidences) / len(confidences) / 100 if confidences else 0.0
    except Exception as e:
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
