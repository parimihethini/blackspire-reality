"""
Property recommendation engine — lightweight feature-based scoring.

sentence-transformers / torch have been removed (too heavy for Render 512 MB
free tier). All recommendations now use _fallback_similarity(), which was
already implemented and tested as the library-unavailable fallback.

The public interface (recommend()) is unchanged — callers receive the same
response schema as before.
"""
from typing import List, Dict, Any

import numpy as np


# ---------------------------------------------------------------------------
# Feature-based similarity (primary and only path)
# ---------------------------------------------------------------------------

def _fallback_similarity(target: Dict, candidates: List[Dict]) -> List[float]:
    """
    Weighted feature-overlap similarity.

    Scoring breakdown (sums to 1.0):
      type match   → 0.25
      city match   → 0.25
      state match  → 0.10
      price delta  → 0.40  (1 − relative_diff, capped at 0)
    """
    scores = []
    t_price = float(target.get("price", 1) or 1)

    for c in candidates:
        s = 0.0
        if c.get("type") == target.get("type"):
            s += 0.25
        if c.get("city") == target.get("city"):
            s += 0.25
        if c.get("state") == target.get("state"):
            s += 0.10
        price_sim = max(0.0, 1 - abs(float(c.get("price", 0) or 0) - t_price) / (t_price + 1))
        s += price_sim * 0.40
        scores.append(s)

    return scores


def _to_feature_dict(p: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise a property dict to the keys _fallback_similarity expects."""
    return {
        "type":  str(p.get("type", "") or ""),
        "city":  str(p.get("city", "") or ""),
        "state": str(p.get("state", "") or ""),
        "price": float(p.get("price", 0) or 0),
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def recommend(
    target: Dict[str, Any],
    candidates: List[Dict[str, Any]],
    limit: int = 6,
) -> Dict[str, Any]:
    """
    Return the top-`limit` most similar properties from `candidates`.

    Args:
        target:     Dict representation of the reference property.
        candidates: List of candidate property dicts.
        limit:      Maximum number of results to return.

    Returns:
        {
            "properties": [...],          # ranked candidate dicts
            "similarity_scores": [...]    # float scores in [0, 1]
        }
    """
    if not candidates:
        return {"properties": [], "similarity_scores": []}

    scores = _fallback_similarity(
        _to_feature_dict(target),
        [_to_feature_dict(c) for c in candidates],
    )

    ranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)[:limit]

    return {
        "properties":        [p for p, _ in ranked],
        "similarity_scores": [round(float(s), 4) for _, s in ranked],
    }
