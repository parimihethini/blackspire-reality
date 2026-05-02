
import os
import google.generativeai as genai
import json

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    # We print the log as requested but don't crash here to allow the rest of the app to start
    print("GEMINI API LOADED: False (Missing GEMINI_API_KEY)")
else:
    print("GEMINI API LOADED: True")
    genai.configure(api_key=API_KEY)

def analyze_document_gemini(text: str):
    """
    Uses Google Gemini 1.5 Flash to extract legal details from OCR text.
    """
    if not API_KEY:
        return {"error": "Missing GEMINI_API_KEY"}
        
    if not text or len(text) < 20:
        return {"error": "No meaningful text extracted"}

    prompt = f"""
Extract key legal document details from this text:

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
        model = genai.GenerativeModel("gemini-1.5-flash")
        # Use generation_config for JSON output if supported or just parse raw
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json"
            )
        )

        return json.loads(response.text)

    except Exception as e:
        return {"error": str(e)}
