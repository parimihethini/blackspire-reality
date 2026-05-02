
import easyocr
import logging
import os

# Initialize reader globally
try:
    reader = easyocr.Reader(['en'], gpu=False)
    _AVAILABLE = True
except Exception as e:
    print(f"[OCR] Error initializing EasyOCR: {e}")
    _AVAILABLE = False

def extract_text_from_image(file_path: str) -> str:
    """
    Extracts text from an image file using EasyOCR.
    Returns clean lowercase text or empty string on failure.
    """
    if not _AVAILABLE:
        return ""

    try:
        # detail=0 returns just the text
        result = reader.readtext(file_path, detail=0)
        return " ".join(result)
    except Exception as e:
        logging.error(f"[OCR] EasyOCR extraction failed for {file_path}: {e}")
        return ""
