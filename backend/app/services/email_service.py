import pickle
import base64
from pathlib import Path
from email.mime.text import MIMEText
from googleapiclient.discovery import build

def _get_gmail_service():
    # Dynamically resolve backend root directory
    BASE_DIR = Path(__file__).resolve().parents[2]
    token_path = BASE_DIR / "token.pickle"

    print("TOKEN PATH:", token_path)
    print("EXISTS:", token_path.exists())

    if not token_path.exists():
        raise FileNotFoundError(f"token.pickle not found at {token_path}")

    with open(token_path, "rb") as token:
        creds = pickle.load(token)

    return build("gmail", "v1", credentials=creds)

def send_email_gmail(to_email: str, subject: str, body_html: str):
    service = _get_gmail_service()

    message = MIMEText(body_html, "html")
    message["to"] = to_email
    message["subject"] = subject

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

    service.users().messages().send(
        userId="me",
        body={"raw": raw}
    ).execute()

def send_otp_email(user_email: str, otp: str):
    html = f""" <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                 background:#0A0F1F;color:#fff;border-radius:16px;"> <h2 style="color:#4DA3FF;">Welcome to Blackspire!</h2> <p>Your verification OTP is:</p> <h1 style="letter-spacing:12px;color:#7CC4FF;font-size:40px;">{otp}</h1> <p style="color:#A0AEC0;">Expires in <strong>10 minutes</strong>.</p> </div>
    """
    send_email_gmail(user_email, "Verify your Blackspire account", html)

def send_reset_email(to_email: str, name: str, token: str):
    link = f"https://blackspire-reality.vercel.app/reset-password?token={token}"

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                background:#0A0F1F;color:#fff;border-radius:16px;">
      <h2 style="color:#4DA3FF;">Password Reset</h2>
      <p>Hi {name},</p>
      <p>Click below to reset your password:</p>
      <a href="{link}" style="display:inline-block;background:#4DA3FF;color:#0A0F1F;
         padding:12px 24px;border-radius:8px;text-decoration:none;">
         Reset Password
      </a>
    </div>
    """
    send_email_gmail(to_email, "Reset your password", html)
