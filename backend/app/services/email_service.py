import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os


def send_email(to_email: str, subject: str, body: str, is_html: bool = True):
    print("SMTP_USER:", os.getenv("SMTP_USER"))
    print("Sending OTP to:", to_email)
    
    msg = MIMEMultipart("alternative") if is_html else MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = os.getenv("EMAIL_FROM") or os.getenv("SMTP_USER")
    msg["To"] = to_email
    
    if is_html:
        msg.attach(MIMEText(body, "html"))
    else:
        # If it was already MIMEText
        pass # The above handles text differently if we used MIMEMultipart, let's keep it simple

    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT") or "587")
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")

    with smtplib.SMTP(host, port) as server:
        server.starttls()
        server.login(user, password)
        server.send_message(msg)


def send_otp(to: str, name: str, otp: str):
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                background:#0A0F1F;color:#fff;border-radius:16px;">
      <h2 style="color:#4DA3FF;">Welcome to Blackspire, {name}!</h2>
      <p>Your verification OTP is:</p>
      <h1 style="letter-spacing:12px;color:#7CC4FF;font-size:40px;">{otp}</h1>
      <p style="color:#A0AEC0;">Expires in <strong>10 minutes</strong>. Do not share this with anyone.</p>
    </div>
    """
    send_email(to, "Verify your Blackspire account", html, is_html=True)


def send_reset_email(to: str, name: str, token: str):
    link = f"https://blackspire-reality.vercel.app/reset-password?token={token}"
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
    send_email(to, "Reset your Blackspire password", html, is_html=True)
