
import pytesseract
from PIL import Image
import os
import logging

# For Windows local dev (safe fallback)
if os.name == "nt":
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def extract_text_from_image(file_path: str) -> str:
    """
    Extracts text from an image file using pytesseract.
    Returns clean text or empty string on failure.
    """
    try:
        image = Image.open(file_path)
        text = pytesseract.image_to_string(image)
        return text.strip()
    except Exception as e:
        logging.error(f"[OCR] pytesseract extraction failed for {file_path}: {e}")
        return ""
