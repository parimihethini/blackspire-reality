import pytesseract
from PIL import Image
import fitz  # PyMuPDF
import logging
from fastapi import UploadFile
import io
import os

# Windows fallback
if os.name == "nt":
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


async def extract_text(file: UploadFile):
    filename = (file.filename or "").lower()
    try:
        if filename.endswith(".txt"):
            content = await file.read()
            try:
                return content.decode("utf-8")
            except Exception:
                return content.decode("latin-1")

        elif filename.endswith(".pdf"):
            data = await file.read()
            doc = fitz.open(stream=data, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            return text

        elif filename.endswith((".png", ".jpg", ".jpeg")):
            # Reset file pointer for PIL
            await file.seek(0)
            img_bytes = await file.read()
            image = Image.open(io.BytesIO(img_bytes))
            text = pytesseract.image_to_string(image)
            return text

        else:
            return None

    except Exception as e:
        logging.error(f"TEXT EXTRACTION ERROR for {filename}: {e}")
        return None
