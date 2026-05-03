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

        # Try common response fields first
        resp_text = None
        if hasattr(response, "text") and getattr(response, "text"):
            resp_text = getattr(response, "text")
        elif hasattr(response, "content") and getattr(response, "content"):
            resp_text = getattr(response, "content")
        else:
            # Some client responses include nested candidate/output fields
            try:
                # Try candidates array
                cand = getattr(response, "candidates", None)
                if cand and isinstance(cand, (list, tuple)) and len(cand) > 0:
                    first = cand[0]
                    resp_text = getattr(first, "text", None) or getattr(first, "content", None) or str(first)
                else:
                    # Try outputs or content[0]
                    outs = getattr(response, "outputs", None) or getattr(response, "content", None)
                    if outs:
                        # attempt to stringify
                        resp_text = str(outs)
            except Exception:
                resp_text = str(response)

        if resp_text is None:
            resp_text = str(response)

        # Normalize to string
        resp_text = str(resp_text)

        # First attempt: direct JSON parse
        try:
            data = json.loads(resp_text)
            return {"status": "success", "data": data}
        except Exception:
            # Second attempt: extract JSON substring via regex
            try:
                m = re.search(r"(\{[\s\S]*\})", resp_text)
                if m:
                    json_part = m.group(1)
                    data = json.loads(json_part)
                    return {"status": "success", "data": data}
            except Exception as ex:
                logging.debug(f"JSON extraction attempt failed: {ex}")

        # If we reach here, parsing failed — log and return standardized failure
        logging.error("Invalid AI response, could not parse JSON from Gemini output")
        logging.debug("Gemini raw response: %s", resp_text)
        return {"status": "failed", "message": "Invalid AI response"}

    except Exception as e:
        logging.error(f"Gemini analysis error: {e}")
        return {"status": "failed", "message": str(e)}
