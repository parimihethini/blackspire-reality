
import re
from typing import Dict, Optional

def extract_fields(text: str) -> Dict[str, Optional[str]]:
    """
    Extracts specific fields (Registration Number, Date) from text using regex.
    """
    results = {
        "registration_number": None,
        "date": None
    }
    
    if not text:
        return results

    # Regex for Registration Number (e.g., REG-123456 or alphanumeric sequence)
    # Looking for patterns like "Reg No: XXXXX" or similar
    reg_patterns = [
        r"(?:reg(?:istration)?\s*(?:no|num|number)?[:.\s-]*)(\w+[\w\s-]{4,20})",
        r"(?:id[:.\s-]*)(\w{5,20})"
    ]
    
    for pattern in reg_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            results["registration_number"] = match.group(1).strip()
            break

    # Regex for Date (DD/MM/YYYY, YYYY-MM-DD, etc.)
    date_pattern = r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}[/-]\d{1,2}[/-]\d{1,2})"
    date_match = re.search(date_pattern, text)
    if date_match:
        # Get the first non-null group
        results["date"] = next(g for g in date_match.groups() if g is not None)

    return results
