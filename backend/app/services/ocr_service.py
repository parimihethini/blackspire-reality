
import logging
from PIL import Image
import pytesseract
import os

def extract_text_from_image(file_path: str) -> str:
    """
    Extracts text from an image file using Pytesseract (lightweight).
    Returns clean lowercase text or empty string on failure.
    """
    if not os.path.exists(file_path):
        logging.error(f"[OCR] File not found: {file_path}")
        return ""

    try:
        # Open image using Pillow
        img = Image.open(file_path)
        
        # Extract text using pytesseract
        # Note: requires tesseract-ocr system binary
        text = pytesseract.image_to_string(img)
        
        if not text:
            return ""

        # Return clean lowercase text for validation
        return text.lower().strip()
    except Exception as e:
        logging.error(f"[OCR] Pytesseract extraction failed for {file_path}: {e}")
        return ""
