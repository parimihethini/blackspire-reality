
from typing import Dict, Optional

def generate_document_summary(extracted_data: Dict[str, Optional[str]], is_valid: bool) -> str:
    """
    Generates a safe summary based ONLY on extracted data.
    Does NOT hallucinate missing fields.
    """
    if not is_valid:
        return "Document verification failed. The provided image does not appear to be a valid property document."
        
    reg = extracted_data.get("registration_number")
    date = extracted_data.get("date")
    
    summary = "Document verified successfully. "
    
    if reg:
        summary += f"Detected Registration Number: {reg}. "
    else:
        summary += "Registration number could not be clearly identified. "
        
    if date:
        summary += f"Document Date: {date}. "
    else:
        summary += "Issue date not detected."
        
    return summary.strip()
