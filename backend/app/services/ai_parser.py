import os
import json
import logging
import re
from google import genai

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("GEMINI API LOADED: False (Missing GEMINI_API_KEY)")
    client = None
else:
    print("GEMINI API LOADED: True")
    client = genai.Client(api_key=API_KEY)
    print("Gemini client initialized (v2 SDK - flash-latest)")


def analyze_document(text: str):
    try:
        if not text or len(text.strip()) == 0:
            return {
                "status": "failed",
                "message": "No text extracted"
            }

        if not client:
            return {
                "status": "failed",
                "message": "Gemini client not initialized (Missing API Key)"
            }

        clean_text = text[:3000]

        prompt = f"""
Extract details and return ONLY valid JSON.

Required fields:
- document_type
- owner
- location
- registration_number
- legal_status
- risk_level

Document:
{clean_text}
"""

        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=prompt
        )
        raw_output = response.text.strip()

        # Try direct JSON parse
        try:
            return json.loads(raw_output)
        except:
            pass

        # Fallback: extract JSON using regex
        match = re.search(r"\{.*\}", raw_output, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except:
                pass

        return {
            "status": "failed",
            "message": "Invalid AI response format"
        }

    except Exception as e:
        return {
            "status": "failed",
            "message": str(e)
        }

