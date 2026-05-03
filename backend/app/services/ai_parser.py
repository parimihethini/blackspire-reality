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
    Sends text to Gemini and returns structured JSON or error.
    """
    if not client:
        return {"status": "failed", "message": "Missing GEMINI_API_KEY"}

    if not text or len(text) < 20:
        return {"status": "failed", "message": "No text extracted"}

    prompt = f"""
Extract structured details from this legal document:

{text}

Return JSON only:
{
  "document_type": "",
  "owner": "",
  "location": "",
  "registration_number": "",
  "legal_status": "",
  "risk_level": ""
}
"""

    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )

        # Some SDK responses expose `text` or `content` fields; handle robustly
        resp_text = getattr(response, "text", None) or getattr(response, "content", None) or str(response)

        try:
            data = json.loads(resp_text)
            return {"status": "success", "data": data}
        except json.JSONDecodeError:
            return {"status": "success", "data": {"raw_response": resp_text}}

    except Exception as e:
        logging.error(f"Gemini analysis error: {e}")
        return {"status": "failed", "message": str(e)}
