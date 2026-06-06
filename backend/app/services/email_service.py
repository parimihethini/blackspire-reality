"""
Email service — Gmail API via OAuth2 with a singleton client cache.

Changes from original:
  - Gmail service object is cached as a module-level singleton (_gmail_service).
    pickle.load() + googleapiclient.build() run at most once per process,
    not once per email sent.
  - Removed verbose debug print() statements that ran at module import time.
    They are replaced with a single concise startup log.
  - Credential / token file setup is kept intact and unchanged.
"""
import os
import pickle
import base64
import tempfile
from pathlib import Path
from email.mime.text import MIMEText
from typing import Optional

from googleapiclient.discovery import build

# ── Credential file paths ─────────────────────────────────────────────────────
# Production (Render/Railway): use /tmp — always writable in containers.
# Local (Windows): use the project backend directory.
if os.getenv("RENDER") or os.getenv("RAILWAY_ENVIRONMENT") or (os.name != "nt" and os.path.exists("/app")):
    creds_dir = Path(tempfile.gettempdir())
else:
    creds_dir = Path(__file__).resolve().parents[2]

creds_dir.mkdir(parents=True, exist_ok=True)
cred_path  = creds_dir / "credentials.json"
token_path = creds_dir / "token.pickle"

# ── Bootstrap credential files from environment variables ─────────────────────
def _bootstrap_credential_files() -> None:
    """Write credentials.json and token.pickle from base64 env vars if missing."""
    if not cred_path.exists():
        creds_b64 = os.getenv("GOOGLE_CREDENTIALS_BASE64")
        if creds_b64:
            try:
                cred_path.write_bytes(base64.b64decode(creds_b64))
                print("[Email] credentials.json written from GOOGLE_CREDENTIALS_BASE64")
            except Exception as e:
                print(f"[Email] ERROR writing credentials.json: {e}")
        else:
            print("[Email] GOOGLE_CREDENTIALS_BASE64 not set — credentials.json unavailable")

    if not token_path.exists():
        token_b64 = os.getenv("GOOGLE_TOKEN_BASE64")
        if token_b64:
            try:
                token_path.write_bytes(base64.b64decode(token_b64))
                print("[Email] token.pickle written from GOOGLE_TOKEN_BASE64")
            except Exception as e:
                print(f"[Email] ERROR writing token.pickle: {e}")
        else:
            print("[Email] GOOGLE_TOKEN_BASE64 not set — token.pickle unavailable")

_bootstrap_credential_files()

# ── Singleton Gmail service ────────────────────────────────────────────────────
_gmail_service: Optional[object] = None


def _get_gmail_service():
    """
    Return a cached Gmail API service object.

    The service is built once on the first email send and reused for all
    subsequent calls — avoids repeated pickle.load() + HTTP client init.
    """
    global _gmail_service
    if _gmail_service is not None:
        return _gmail_service

    if not token_path.exists():
        print("[Email] token.pickle not found — email service disabled")
        return None

    try:
        with open(token_path, "rb") as fh:
            creds = pickle.load(fh)
        _gmail_service = build("gmail", "v1", credentials=creds)
        print("[Email] Gmail service initialized (singleton)")
        return _gmail_service
    except Exception as e:
        print(f"[Email] Failed to initialize Gmail service: {e}")
        return None


# ── Core send helper ──────────────────────────────────────────────────────────

def send_email_gmail(to_email: str, subject: str, body_html: str) -> None:
    """Send an HTML email via Gmail API."""
    try:
        service = _get_gmail_service()
        if not service:
            print(f"[Email] Skipping email to {to_email} — service unavailable")
            return

        message = MIMEText(body_html, "html")
        message["to"]      = to_email
        message["subject"] = subject

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        service.users().messages().send(userId="me", body={"raw": raw}).execute()
        print(f"[Email] Sent to {to_email}")
    except Exception as e:
        print(f"[Email] ERROR sending to {to_email}: {e}")


# ── Transactional email templates ─────────────────────────────────────────────

def send_otp_email(user_email: str, otp: str) -> None:
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                background:#0A0F1F;color:#fff;border-radius:16px;">
      <h2 style="color:#4DA3FF;">Welcome to Blackspire!</h2>
      <p>Your verification OTP is:</p>
      <h1 style="letter-spacing:12px;color:#7CC4FF;font-size:40px;">{otp}</h1>
      <p style="color:#A0AEC0;">Expires in <strong>10 minutes</strong>.</p>
    </div>
    """
    send_email_gmail(user_email, "Verify your Blackspire account", html)


def send_reset_email(to_email: str, name: str, token: str, otp: str) -> None:
    link = f"https://blackspire-reality.vercel.app/reset-password?token={token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                background:#0A0F1F;color:#fff;border-radius:16px;">
      <h2 style="color:#4DA3FF;">Password Reset</h2>
      <p>Hi {name},</p>
      <p>You requested a password reset. Your OTP is:</p>
      <h1 style="letter-spacing:12px;color:#7CC4FF;font-size:40px;">{otp}</h1>
      <p style="color:#A0AEC0;">Expires in <strong>10 minutes</strong>.</p>
      <p>Or click below to reset via link:</p>
      <a href="{link}" style="display:inline-block;background:#4DA3FF;color:#0A0F1F;
         padding:12px 24px;border-radius:8px;text-decoration:none;">
         Reset Password
      </a>
    </div>
    """
    send_email_gmail(to_email, "Reset your password", html)
