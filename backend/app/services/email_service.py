import os
import pickle
import base64
import tempfile
from pathlib import Path
from email.mime.text import MIMEText
from googleapiclient.discovery import build

# Determine the working directory for credential files
# Prefer /tmp for Render/production (writable), fall back to project directory for local dev
if os.getenv("RENDER") or os.getenv("RAILWAY_ENVIRONMENT") or (os.name != "nt" and os.path.exists("/app")):
    # Production: Use /tmp which is always writable in containers
    creds_dir = Path(tempfile.gettempdir())
else:
    # Local development: Use project backend directory
    creds_dir = Path(__file__).resolve().parents[2]

# Ensure the directory exists
creds_dir.mkdir(parents=True, exist_ok=True)

cred_path = creds_dir / "credentials.json"
token_path = creds_dir / "token.pickle"

# DEBUG LOGS
print(f"CREDENTIALS DIR: {creds_dir}")
print(f"CRED_PATH: {cred_path}")
print(f"TOKEN_PATH: {token_path}")
print("CHECKING FILES...")
print("cred exists:", cred_path.exists())
print("token exists:", token_path.exists())

# Create credentials.json from environment variable
if not cred_path.exists():
    creds_base64 = os.getenv("GOOGLE_CREDENTIALS_BASE64")
    if creds_base64:
        try:
            print("CREATING credentials.json from ENV")
            with open(cred_path, "wb") as f:
                f.write(base64.b64decode(creds_base64))
            print(f"Successfully created {cred_path}")
        except Exception as e:
            print(f"ERROR creating credentials.json: {e}")
    else:
        print("MISSING GOOGLE_CREDENTIALS_BASE64")

# Create token.pickle from environment variable
if not token_path.exists():
    token_base64 = os.getenv("GOOGLE_TOKEN_BASE64")
    if token_base64:
        try:
            print("CREATING token.pickle from ENV")
            with open(token_path, "wb") as f:
                f.write(base64.b64decode(token_base64))
            print(f"Successfully created {token_path}")
        except Exception as e:
            print(f"ERROR creating token.pickle: {e}")
    else:
        print("MISSING GOOGLE_TOKEN_BASE64")

# Final check
print("FINAL cred exists:", cred_path.exists())
print("FINAL token exists:", token_path.exists())

def _get_gmail_service():

    print("TOKEN PATH:", token_path)
    print("EXISTS:", token_path.exists())

    if not token_path.exists():
        print("WARNING: token.pickle not found. Email service will be disabled.")
        return None

    try:
        with open(token_path, "rb") as token:
            creds = pickle.load(token)

        return build("gmail", "v1", credentials=creds)
    except Exception as e:
        print(f"WARNING: Failed to load gmail service: {e}")
        return None

def send_email_gmail(to_email: str, subject: str, body_html: str):
    try:
        service = _get_gmail_service()
        if not service:
            print(f"WARNING: Skipping email to {to_email} (service unavailable)")
            return

        message = MIMEText(body_html, "html")
        message["to"] = to_email
        message["subject"] = subject

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

        service.users().messages().send(
            userId="me",
            body={"raw": raw}
        ).execute()
        print(f"Email successfully sent to {to_email}")
    except Exception as e:
        print(f"ERROR sending email to {to_email}: {e}")

def send_otp_email(user_email: str, otp: str):
    html = f""" <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                 background:#0A0F1F;color:#fff;border-radius:16px;"> <h2 style="color:#4DA3FF;">Welcome to Blackspire!</h2> <p>Your verification OTP is:</p> <h1 style="letter-spacing:12px;color:#7CC4FF;font-size:40px;">{otp}</h1> <p style="color:#A0AEC0;">Expires in <strong>10 minutes</strong>.</p> </div>
    """
    send_email_gmail(user_email, "Verify your Blackspire account", html)

def send_reset_email(to_email: str, name: str, token: str, otp: str):
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
