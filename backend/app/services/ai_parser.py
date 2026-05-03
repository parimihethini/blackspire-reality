import os
import json
import logging
import re
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
    try:
        if not text or len(text.strip()) == 0:
            return {
                "status": "failed",
                "message": "No text extracted"
            }

        if not model:
            return {
                "status": "failed",
                "message": "Gemini model not initialized (Missing API Key)"
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

        response = model.generate_content(prompt)
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

