"""
Semantic property recommendation using sentence-transformers.
Falls back to feature-based cosine similarity if the library is unavailable.
"""
from typing import List, Dict, Any

try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
    _ST_AVAILABLE = True
except ImportError:
    _ST_AVAILABLE = False
    import numpy as np

_embed_model = None


def _get_embed_model():
    global _embed_model
    if _embed_model is None and _ST_AVAILABLE:
        print("[AI] Loading sentence-transformer model…")
        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embed_model


def _to_text(p: Dict[str, Any]) -> str:
    parts = [
        str(p.get("title", "")),
        str(p.get("description", "")),
        str(p.get("type", "")),
        str(p.get("city", "")),
        str(p.get("area", "")),
        " ".join(p.get("features", []) or []),
    ]
    return " ".join(x for x in parts if x)


def _fallback_similarity(target: Dict, candidates: List[Dict]) -> List[float]:
    """Feature-overlap similarity when sentence-transformers not available."""
    scores = []
    t_price = float(target.get("price", 1))
    for c in candidates:
        s = 0.0
        if c.get("type") == target.get("type"):
            s += 0.25
        if c.get("city") == target.get("city"):
            s += 0.25
        if c.get("state") == target.get("state"):
            s += 0.10
        price_sim = max(0.0, 1 - abs(float(c.get("price", 0)) - t_price) / (t_price + 1))
        s += price_sim * 0.40
        scores.append(s)
    return scores


def recommend(
    target: Dict[str, Any],
    candidates: List[Dict[str, Any]],
    limit: int = 6,
) -> Dict[str, Any]:
    if not candidates:
        return {"properties": [], "similarity_scores": []}

    model = _get_embed_model()

    if model and _ST_AVAILABLE:
        texts = [_to_text(target)] + [_to_text(c) for c in candidates]
        embeddings = model.encode(texts, normalize_embeddings=True)
        target_emb = embeddings[0]
        scores = np.dot(embeddings[1:], target_emb).tolist()
    else:
        scores = _fallback_similarity(target, candidates)

    ranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)[:limit]
    return {
        "properties": [p for p, _ in ranked],
        "similarity_scores": [round(float(s), 4) for _, s in ranked],
    }
