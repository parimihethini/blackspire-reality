
import os
from openai import OpenAI
import json

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def analyze_document(text: str):
    """
    Uses OpenAI GPT-4o-mini to extract legal details from OCR text.
    """
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
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={ "type": "json_object" }
        )

        content = response.choices[0].message.content
        return json.loads(content)

    except Exception as e:
        return {"error": str(e)}
