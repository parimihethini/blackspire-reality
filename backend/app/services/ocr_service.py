
import os
import cv2
import numpy as np
from paddleocr import PaddleOCR
import logging

# Initialize OCR globally to avoid reloading model each request
# use_angle_cls=True helps with rotated documents
# lang='en' for English
try:
    ocr_model = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
    OCR_AVAILABLE = True
except Exception as e:
    print(f"[OCR] Error initializing PaddleOCR: {e}")
    ocr_model = None
    OCR_AVAILABLE = False

def extract_text_from_image(file_path: str) -> str:
    """
    Extracts text from an image file using PaddleOCR.
    Returns clean lowercase text or empty string on failure.
    """
    if not OCR_AVAILABLE or ocr_model is None:
        return ""

    try:
        # PaddleOCR expects a file path or numpy array
        result = ocr_model.ocr(file_path, cls=True)
        
        if not result or not result[0]:
            return ""

        extracted_lines = []
        for line in result[0]:
            # line[1][0] is the text content
            text = line[1][0]
            extracted_lines.append(text.lower())
            
        return " ".join(extracted_lines)
    except Exception as e:
        logging.error(f"[OCR] Extraction failed for {file_path}: {e}")
        return ""
