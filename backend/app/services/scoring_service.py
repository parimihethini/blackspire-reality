
from typing import Dict, Any

def calculate_confidence(match_count: int, extracted_data: Dict[str, Any]) -> int:
    """
    Calculates a confidence percentage based on matches and extracted fields.
    """
    score = (match_count / 4) * 50  # 4 is total keywords, contributes 50%
    
    if extracted_data.get("registration_number"):
        score += 30
    if extracted_data.get("date"):
        score += 20
        
    return int(min(score, 100))

def assess_fraud_risk(extracted_data: Dict[str, Any], is_valid: bool) -> str:
    """
    Assesses fraud risk level.
    """
    if not is_valid:
        return "HIGH"
        
    if not extracted_data.get("registration_number"):
        return "HIGH"
        
    if not extracted_data.get("date"):
        return "MEDIUM"
        
    return "LOW"
