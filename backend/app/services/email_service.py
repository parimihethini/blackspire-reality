"""
Email service — Gmail API via OAuth2 with token refresh and explicit errors.
"""
import os
import pickle
import base64
import tempfile
from pathlib import Path
from email.mime.text import MIMEText
from typing import Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.core.config import settings

GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"


class EmailDeliveryError(Exception):
    """Raised when Gmail cannot send a message."""


def _is_production_container() -> bool:
    return bool(
        os.getenv("RENDER")
        or os.getenv("RAILWAY_ENVIRONMENT")
        or (os.name != "nt" and os.path.exists("/app"))
    )


# ── Credential file paths ─────────────────────────────────────────────────────
if _is_production_container():
    creds_dir = Path(tempfile.gettempdir())
else:
    creds_dir = Path(__file__).resolve().parents[2]

creds_dir.mkdir(parents=True, exist_ok=True)
cred_path = creds_dir / "credentials.json"
token_path = creds_dir / "token.pickle"


def _bootstrap_credential_files() -> None:
    """Write OAuth files from base64 env vars (always refresh in production)."""
    creds_b64 = os.getenv("GOOGLE_CREDENTIALS_BASE64")
    token_b64 = os.getenv("GOOGLE_TOKEN_BASE64")
    overwrite = _is_production_container()

    if creds_b64 and (overwrite or not cred_path.exists()):
        try:
            cred_path.write_bytes(base64.b64decode(creds_b64))
            print("[Email] credentials.json loaded from GOOGLE_CREDENTIALS_BASE64")
        except Exception as e:
            print(f"[Email] ERROR writing credentials.json: {e}")

    if token_b64 and (overwrite or not token_path.exists()):
        try:
            token_path.write_bytes(base64.b64decode(token_b64))
            print("[Email] token.pickle loaded from GOOGLE_TOKEN_BASE64")
        except Exception as e:
            print(f"[Email] ERROR writing token.pickle: {e}")

    if not cred_path.exists():
        print("[Email] credentials.json missing — set GOOGLE_CREDENTIALS_BASE64 on Render")
    if not token_path.exists():
        print("[Email] token.pickle missing — set GOOGLE_TOKEN_BASE64 on Render")


_bootstrap_credential_files()

_gmail_service: Optional[object] = None
_email_ready: Optional[bool] = None


def _load_credentials() -> Credentials:
    if not token_path.exists():
        raise EmailDeliveryError(
            "Gmail token not configured. Set GOOGLE_TOKEN_BASE64 in Render environment."
        )

    with open(token_path, "rb") as fh:
        creds = pickle.load(fh)

    if not isinstance(creds, Credentials):
        raise EmailDeliveryError("Invalid Gmail token format. Regenerate token.pickle.")

    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            token_path.write_bytes(pickle.dumps(creds))
            print("[Email] OAuth access token refreshed")
        except Exception as e:
            raise EmailDeliveryError(
                "Gmail OAuth token expired. Regenerate token.pickle and update GOOGLE_TOKEN_BASE64."
            ) from e

    if not creds.valid:
        raise EmailDeliveryError(
            "Gmail credentials are invalid. Regenerate token.pickle and update GOOGLE_TOKEN_BASE64."
        )

    scopes = set(creds.scopes or [])
    if GMAIL_SEND_SCOPE not in scopes:
        raise EmailDeliveryError(
            "Gmail token is missing the gmail.send scope. "
            "Run backend/generate_token.py while signed in as blackspirereality@gmail.com."
        )

    return creds


def _get_gmail_service():
    global _gmail_service
    if _gmail_service is not None:
        return _gmail_service

    creds = _load_credentials()
    _gmail_service = build("gmail", "v1", credentials=creds, cache_discovery=False)
    print(f"[Email] Gmail service ready for {settings.EMAIL_FROM}")
    return _gmail_service


def verify_email_service() -> bool:
    """Validate Gmail OAuth credentials without calling read-only Gmail APIs."""
    global _email_ready
    try:
        creds = _load_credentials()
        _get_gmail_service()
        print(
            f"[Email] OAuth ready for {settings.EMAIL_FROM} "
            f"(scopes: {', '.join(creds.scopes or [])})"
        )
        _email_ready = True
        print("[Email] Verification OK")
        return True
    except EmailDeliveryError as e:
        _email_ready = False
        print(f"[Email] Verification FAILED: {e}")
        return False
    except Exception as e:
        _email_ready = False
        print(f"[Email] Verification FAILED: {e}")
        return False


def _format_gmail_http_error(exc: HttpError) -> str:
    if exc.resp.status == 403:
        return (
            f"Gmail permission denied for {settings.EMAIL_FROM}. "
            "Regenerate token.pickle with gmail.send scope while signed in as that account."
        )
    return f"Gmail send failed ({exc.resp.status}): {exc}"


def get_email_status() -> dict:
    """Return email service status for health checks (no email sent)."""
    try:
        creds = _load_credentials()
        return {
            "configured": True,
            "from": settings.EMAIL_FROM,
            "transport": "smtp" if os.getenv("GMAIL_APP_PASSWORD") else "gmail_api",
            "scopes": list(creds.scopes or []),
        }
    except EmailDeliveryError as e:
        return {"configured": False, "from": settings.EMAIL_FROM, "error": str(e)}
    except Exception as e:
        return {"configured": False, "from": settings.EMAIL_FROM, "error": str(e)}


def _send_via_smtp(to_email: str, subject: str, body_html: str) -> None:
    import smtplib
    from email.mime.text import MIMEText as SmtpMIMEText

    app_password = os.getenv("GMAIL_APP_PASSWORD")
    if not app_password:
        raise EmailDeliveryError("GMAIL_APP_PASSWORD not configured for SMTP.")

    msg = SmtpMIMEText(body_html, "html")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email

    with smtplib.SMTP("smtp.gmail.com", 587, timeout=30) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(settings.EMAIL_FROM, app_password)
        server.send_message(msg)


def send_email_gmail(to_email: str, subject: str, body_html: str) -> None:
    """Send an HTML email. Prefers SMTP when GMAIL_APP_PASSWORD is set."""
    smtp_password = os.getenv("GMAIL_APP_PASSWORD")
    if smtp_password:
        try:
            _send_via_smtp(to_email, subject, body_html)
            print(f"[Email] Sent via SMTP '{subject}' to {to_email}")
            return
        except Exception as e:
            print(f"[Email] SMTP failed, falling back to Gmail API: {e}")

    try:
        service = _get_gmail_service()
        message = MIMEText(body_html, "html")
        message["to"] = to_email
        message["from"] = settings.EMAIL_FROM
        message["subject"] = subject

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        service.users().messages().send(userId="me", body={"raw": raw}).execute()
        print(f"[Email] Sent via Gmail API '{subject}' to {to_email}")
    except EmailDeliveryError:
        raise
    except HttpError as e:
        raise EmailDeliveryError(_format_gmail_http_error(e)) from e
    except Exception as e:
        raise EmailDeliveryError(f"Gmail send failed: {e}") from e


def _frontend_base_url() -> str:
    return os.getenv("FRONTEND_URL", "https://blackspire-reality.vercel.app").rstrip("/")


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
    link = f"{_frontend_base_url()}/reset-password?token={token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                background:#0A0F1F;color:#fff;border-radius:16px;">
      <h2 style="color:#4DA3FF;">Password Reset</h2>
      <p>Hi {name},</p>
      <p>You requested a password reset for your Blackspire account.</p>
      <p>Your OTP is:</p>
      <h1 style="letter-spacing:12px;color:#7CC4FF;font-size:40px;">{otp}</h1>
      <p style="color:#A0AEC0;">Expires in <strong>10 minutes</strong>.</p>
      <p>Or click below to reset via link:</p>
      <a href="{link}" style="display:inline-block;background:#4DA3FF;color:#0A0F1F;
         padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
         Reset Password
      </a>
      <p style="color:#A0AEC0;margin-top:24px;font-size:12px;">
        Sent from {settings.EMAIL_FROM}
      </p>
    </div>
    """
    send_email_gmail(to_email, "Reset your Blackspire password", html)
