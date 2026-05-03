
import os
import json
import logging
from google import genai

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("GEMINI API LOADED: False (Missing GEMINI_API_KEY)")
    client = None
else:
    print("GEMINI API LOADED: True")
    client = genai.Client(api_key=API_KEY)
    print("Gemini client initialized")

def analyze_document(text: str):
    """
    Uses Google Gemini 1.5 Flash to extract legal details from OCR text.
    Returns structured analysis or error.
    """
    if not client:
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
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )

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
    if not client:
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
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )

        return json.loads(response.text)

    except Exception as e:
        logging.error(f"Gemini legacy analysis error: {e}")
        return {"error": str(e)}
