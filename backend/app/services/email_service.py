import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os

from app.core.config import settings


def _send(to: str, subject: str, html: str) -> bool:
    smtp_user = (os.getenv("SMTP_USER") or settings.SMTP_USER or "").strip()
    smtp_pass = (settings.SMTP_PASSWORD or "").strip()
    if not smtp_user or not smtp_pass:
        print("[Email] SMTP not configured (missing SMTP_USER/SMTP_PASSWORD)")
        return False
    # For Gmail SMTP, the authenticated user is the only reliable sender.
    # Force sender to be SMTP_USER to avoid any stale/incorrect EMAIL_FROM values.
    sender_email = smtp_user

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Blackspire Realty <{sender_email}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))
    try:
        print(f"[Email] Using SMTP_USER={smtp_user} FROM={sender_email} TO={to}")
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as srv:
            srv.ehlo()
            srv.starttls()
            srv.ehlo()
            srv.login(smtp_user, smtp_pass)
            srv.sendmail(sender_email, to, msg.as_string())
        return True
    except Exception as e:
        print(f"[Email] Send failed: {type(e).__name__}: {e}")
        return False


def send_otp(to: str, name: str, otp: str) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                background:#0A0F1F;color:#fff;border-radius:16px;">
      <h2 style="color:#4DA3FF;">Welcome to Blackspire, {name}!</h2>
      <p>Your verification OTP is:</p>
      <h1 style="letter-spacing:12px;color:#7CC4FF;font-size:40px;">{otp}</h1>
      <p style="color:#A0AEC0;">Expires in <strong>10 minutes</strong>. Do not share this with anyone.</p>
    </div>
    """
    return _send(to, "Verify your Blackspire account", html)


def send_reset_email(to: str, name: str, token: str) -> bool:
    link = f"http://localhost:3000/reset-password?token={token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                background:#0A0F1F;color:#fff;border-radius:16px;">
      <h2 style="color:#4DA3FF;">Password Reset – Blackspire</h2>
      <p>Hi {name},</p>
      <p>Click the button below to reset your password:</p>
      <a href="{link}" style="display:inline-block;background:#4DA3FF;color:#0A0F1F;
         padding:12px 24px;border-radius:8px;font-weight:bold;text-decoration:none;">
         Reset Password
      </a>
      <p style="color:#A0AEC0;margin-top:16px;">This link expires in 1 hour.</p>
    </div>
    """
    return _send(to, "Reset your Blackspire password", html)
