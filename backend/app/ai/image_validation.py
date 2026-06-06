"""
Image validation — lightweight PIL-only implementation.

PyTorch / torchvision have been removed (too heavy for Render 512 MB free tier).
This module performs structural image quality checks using Pillow only:
  - File is a valid image (not corrupt)
  - Resolution is adequate (>= 200 x 200 px)
  - File size is meaningful (> 5 KB)
  - Format is an accepted type (JPEG, PNG, WEBP, GIF, BMP)

The response schema is identical to the previous ResNet-18 version so all
callers continue to work without changes.
"""
import io
from typing import Dict, Any

from PIL import Image, UnidentifiedImageError

# Formats we consider acceptable property uploads
ACCEPTED_FORMATS = {"JPEG", "PNG", "WEBP", "GIF", "BMP"}

MIN_DIMENSION_PX = 200   # pixels — both width and height must meet this
MIN_FILE_BYTES   = 5_000 # 5 KB — reject suspiciously tiny files
MAX_FILE_BYTES   = 10 * 1024 * 1024  # 10 MB (enforced by caller, checked here too)


def validate_image(file_bytes: bytes) -> Dict[str, Any]:
    """
    Validate an uploaded image using PIL only.

    Returns a dict with the same keys as the previous torch-based version:
      is_valid, label, confidence, is_property_image, issues
    """
    issues = []

    # ── File size guard ───────────────────────────────────────────────────────
    if len(file_bytes) < MIN_FILE_BYTES:
        issues.append(f"Image file size suspiciously small ({len(file_bytes)} bytes < {MIN_FILE_BYTES})")

    if len(file_bytes) > MAX_FILE_BYTES:
        issues.append(f"Image exceeds maximum allowed size (10 MB)")
        return {
            "is_valid": False,
            "label": "oversized",
            "confidence": 0.0,
            "is_property_image": False,
            "issues": issues,
        }

    # ── Open and decode ───────────────────────────────────────────────────────
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()  # checks for truncation / corruption without full decode
        # Re-open after verify (verify closes the file pointer)
        img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    except UnidentifiedImageError:
        return {
            "is_valid": False,
            "label": "unrecognized",
            "confidence": 0.0,
            "is_property_image": False,
            "issues": ["Cannot open image: unrecognized file format"],
        }
    except Exception as e:
        return {
            "is_valid": False,
            "label": "invalid",
            "confidence": 0.0,
            "is_property_image": False,
            "issues": [f"Cannot open image: {str(e)}"],
        }

    # ── Format check ─────────────────────────────────────────────────────────
    fmt = (img.format or "").upper()
    if fmt and fmt not in ACCEPTED_FORMATS:
        issues.append(f"Unsupported image format: {fmt}. Accepted: {', '.join(sorted(ACCEPTED_FORMATS))}")

    # ── Resolution check ─────────────────────────────────────────────────────
    w, h = img.size
    if w < MIN_DIMENSION_PX or h < MIN_DIMENSION_PX:
        issues.append(f"Image resolution too low ({w}x{h}px). Minimum: {MIN_DIMENSION_PX}x{MIN_DIMENSION_PX}px")

    # ── Determine label and confidence ────────────────────────────────────────
    # Without a vision model we cannot classify content, so we return a
    # neutral label with moderate confidence when structural checks pass.
    is_valid = len(issues) == 0
    label    = "image" if is_valid else "invalid"
    # Confidence reflects structural quality only (not semantic content)
    confidence = round(min(w, h) / 1000, 3) if is_valid else 0.0
    confidence = min(confidence, 0.90)  # cap at 0.90 — no deep validation

    return {
        "is_valid": is_valid,
        "label": label,
        "confidence": confidence,
        "is_property_image": is_valid,  # assumed valid if structural checks pass
        "issues": issues,
    }
