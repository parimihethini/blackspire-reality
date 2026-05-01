"""
Image validation using torchvision pretrained ResNet-18.
Checks if uploaded images are real property photos (not blank, corrupted, or irrelevant).
"""
import io
from typing import Dict, Any

try:
    import torch
    import torchvision.transforms as T
    from torchvision.models import resnet18, ResNet18_Weights
    from PIL import Image
    _TORCH_AVAILABLE = True
except ImportError:
    _TORCH_AVAILABLE = False

_model = None
_transform = None


def _get_model():
    global _model, _transform
    if _model is None and _TORCH_AVAILABLE:
        print("[AI] Loading ResNet-18 for image validation…")
        weights = ResNet18_Weights.DEFAULT
        _model = resnet18(weights=weights)
        _model.eval()
        _transform = T.Compose([
            T.Resize(256),
            T.CenterCrop(224),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
    return _model, _transform


# ImageNet classes we consider "property-relevant"
PROPERTY_RELATED = {
    "house", "building", "home", "architecture", "wall", "ceiling", "floor",
    "window", "door", "staircase", "balcony", "pool", "garden", "land",
    "street", "suburban", "villa", "apartment", "mansion",
}


def validate_image(file_bytes: bytes) -> Dict[str, Any]:
    issues = []

    if not _TORCH_AVAILABLE:
        return {
            "is_valid": True,
            "label": "unknown",
            "confidence": 0.0,
            "is_property_image": True,
            "issues": ["torch/torchvision not installed – image accepted without deep validation"],
        }

    try:
        img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    except Exception as e:
        return {
            "is_valid": False,
            "label": "invalid",
            "confidence": 0.0,
            "is_property_image": False,
            "issues": [f"Cannot open image: {str(e)}"],
        }

    # Basic quality checks
    w, h = img.size
    if w < 200 or h < 200:
        issues.append("Image resolution too low (< 200px)")
    if len(file_bytes) < 5000:
        issues.append("Image file size suspiciously small")

    model, transform = _get_model()
    tensor = transform(img).unsqueeze(0)

    with torch.no_grad():
        outputs = model(tensor)
        probs = torch.nn.functional.softmax(outputs[0], dim=0)
        top5_probs, top5_idxs = torch.topk(probs, 5)

    weights = ResNet18_Weights.DEFAULT
    labels = weights.meta["categories"]

    top_label = labels[top5_idxs[0].item()].lower()
    top_conf = float(top5_probs[0])

    top5_labels = [labels[i.item()].lower() for i in top5_idxs]
    is_property = any(
        any(kw in lbl for kw in PROPERTY_RELATED)
        for lbl in top5_labels
    )

    return {
        "is_valid": len(issues) == 0,
        "label": top_label,
        "confidence": round(top_conf, 3),
        "is_property_image": is_property,
        "issues": issues,
    }
