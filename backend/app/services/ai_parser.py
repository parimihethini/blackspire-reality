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
        """
        Safe AI call: always defines prompt, limits input size, and returns
        a dict with status and data or an error message.
        """
        try:
            if not client:
                return {"status": "failed", "message": "Missing GEMINI_API_KEY"}

            if not text or len(text.strip()) == 0:
                return {"status": "failed", "message": "No text extracted from document"}

            # Limit input size to avoid huge prompts
            clean_text = text[:3000]

            prompt = f"""
    Extract the following details from this document and return ONLY valid JSON:

    Fields:
    - document_type
    - owner
    - location
    - registration_number
    - legal_status
    - risk_level (LOW / MEDIUM / HIGH)

    Document:
    {clean_text}
    """

            # Call Gemini via client
            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=prompt
            )

            # Normalize response text
            raw_output = getattr(response, "text", None) or getattr(response, "content", None) or str(response)
            raw_output = str(raw_output).strip()

            # Debug logs
            logging.debug("Gemini raw response: %s", raw_output)

            # 1) Try direct JSON parse
            try:
                parsed = json.loads(raw_output)
                return {"status": "success", "data": parsed}
            except Exception:
                pass

            # 2) Regex fallback: extract JSON object
            try:
                match = re.search(r"\{[\s\S]*\}", raw_output)
                if match:
                    json_str = match.group(0)
                    # Clean up string
                    cleaned = json_str.replace("\n", " ").replace("\r", " ").replace("\t", " ").strip()
                    logging.debug("Extracted JSON string: %s", cleaned)
                    parsed = json.loads(cleaned)
                    return {"status": "success", "data": parsed}
            except Exception as ex:
                logging.debug("JSON extract/parse failed: %s", ex)

            return {"status": "failed", "message": "AI returned invalid format"}

        except Exception as e:
            logging.error("AI parsing error: %s", e)
            return {"status": "failed", "message": str(e)}
