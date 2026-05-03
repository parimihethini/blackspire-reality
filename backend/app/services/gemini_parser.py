
import os
import json
import logging
import google.generativeai as genai

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("GEMINI API LOADED: False (Missing GEMINI_API_KEY)")
    model = None
else:
    print("GEMINI API LOADED: True")
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash-latest")
    print("Gemini model initialized (flash-latest)")

def analyze_document(text: str):
    """
    Uses Google Gemini 1.5 Flash to extract legal details from OCR text.
    Returns structured analysis or error.
    """
    if not model:
        return {"status": "failed", "message": "Missing GEMINI_API_KEY"}
        
    if not text or len(text) < 20:
        return {"status": "failed", "message": "No meaningful text extracted"}

    prompt = f"""Extract structured details from this legal document text:

{text}

Return JSON only with exactly these keys:
{{
  "document_type": "",
  "owner": "",
  "location": "",
  "registration_number": "",
  "legal_status": "",
  "risk_level": ""
}}
"""

    try:
        response = model.generate_content(prompt)

        try:
            result = json.loads(response.text)
            return {"status": "success", "data": result}
        except json.JSONDecodeError:
            # If response is not JSON, return it as-is
            return {"status": "success", "data": {"raw_response": response.text}}

    except Exception as e:
        logging.error(f"Gemini analysis error: {e}")
        return {"status": "error", "message": str(e)}


def analyze_document_gemini(text: str):
    """
    Legacy wrapper for backward compatibility.
    Uses Google Gemini 1.5 Flash to extract legal details from OCR text.
    """
    if not model:
        return {"error": "Missing GEMINI_API_KEY"}
        
    if not text or len(text) < 20:
        return {"error": "No meaningful text extracted"}

    prompt = f"""Extract key legal document details from this text:

{text}

Return JSON with exactly these keys:
- document_type
- owner
- location
- registration_number
- legal_status (clear/unclear)
- risk_level (low/medium/high)
"""

    try:
        response = model.generate_content(prompt)

        return json.loads(response.text)

    except Exception as e:
        logging.error(f"Gemini legacy analysis error: {e}")
        return {"error": str(e)}
