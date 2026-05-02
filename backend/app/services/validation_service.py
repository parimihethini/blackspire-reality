
from typing import Tuple

REQUIRED_KEYWORDS = ["registration", "owner", "property", "location"]

def validate_document_text(text: str) -> Tuple[bool, int]:
    """
    Validates if the document text contains enough relevant keywords.
    Returns (is_valid, match_count).
    """
    if not text:
        return False, 0

    text_lower = text.lower()
    matches = 0
    for keyword in REQUIRED_KEYWORDS:
        if keyword in text_lower:
            matches += 1
            
    # Threshold: At least 2 matches required to be considered a valid property document
    is_valid = matches >= 2
    
    return is_valid, matches
