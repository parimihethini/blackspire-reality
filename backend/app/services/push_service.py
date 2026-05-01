import json
import os
from typing import Any

try:
    from pywebpush import webpush  # type: ignore
except Exception:
    webpush = None

# In-memory store: { user_id: subscription_info }
_SUBSCRIPTIONS: dict[int, dict[str, Any]] = {}


def set_subscription(user_id: int, subscription: dict[str, Any]) -> None:
    _SUBSCRIPTIONS[user_id] = subscription


def get_subscription(user_id: int) -> dict[str, Any] | None:
    return _SUBSCRIPTIONS.get(user_id)


def send_push(subscription: dict[str, Any], title: str, body: str) -> bool:
    if webpush is None:
        print("[PUSH] pywebpush not installed; skipping push send")
        return False

    public_key = (os.getenv("VAPID_PUBLIC_KEY") or "").strip()
    private_key = (os.getenv("VAPID_PRIVATE_KEY") or "").strip()
    if not public_key or not private_key:
        print("[PUSH] Missing VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY; skipping push send")
        return False

    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps({"title": title, "body": body}),
            vapid_private_key=private_key,
            vapid_claims={"sub": "mailto:blackspirereality@gmail.com"},
        )
        return True
    except Exception as e:
        print(f"[PUSH] Send failed: {type(e).__name__}: {e}")
        return False

