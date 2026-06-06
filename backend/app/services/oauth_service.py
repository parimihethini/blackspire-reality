"""OAuth helpers for Google and LinkedIn sign-in."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlencode

import httpx
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.core.config import settings


class OAuthError(Exception):
    """Raised when OAuth verification or token exchange fails."""


def _google_client_id() -> str:
    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id:
        raise OAuthError("Google OAuth is not configured (GOOGLE_CLIENT_ID).")
    return client_id


def verify_google_id_token(token: str) -> dict[str, Any]:
    """Verify Google ID token and return claims (email, sub, name, picture)."""
    try:
        claims = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            _google_client_id(),
        )
    except Exception as exc:
        raise OAuthError(f"Invalid Google token: {exc}") from exc

    if claims.get("email_verified") is False:
        raise OAuthError("Google email is not verified.")

    email = claims.get("email")
    sub = claims.get("sub")
    if not email or not sub:
        raise OAuthError("Google token missing email or subject.")

    return {
        "email": str(email).lower(),
        "google_id": str(sub),
        "name": claims.get("name") or email.split("@")[0],
        "picture": claims.get("picture"),
    }


def linkedin_auth_url(redirect_uri: str, state: str) -> str:
    if not settings.LINKEDIN_CLIENT_ID:
        raise OAuthError("LinkedIn OAuth is not configured (LINKEDIN_CLIENT_ID).")
    params = {
        "response_type": "code",
        "client_id": settings.LINKEDIN_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "state": state,
        "scope": "openid profile email",
    }
    return f"https://www.linkedin.com/oauth/v2/authorization?{urlencode(params)}"


def exchange_linkedin_code(code: str, redirect_uri: str) -> dict[str, Any]:
    if not settings.LINKEDIN_CLIENT_ID or not settings.LINKEDIN_CLIENT_SECRET:
        raise OAuthError("LinkedIn OAuth is not configured.")

    token_url = "https://www.linkedin.com/oauth/v2/accessToken"
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": settings.LINKEDIN_CLIENT_ID,
        "client_secret": settings.LINKEDIN_CLIENT_SECRET,
    }

    with httpx.Client(timeout=20.0) as client:
        token_resp = client.post(
            token_url,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_resp.status_code != 200:
            raise OAuthError(f"LinkedIn token exchange failed: {token_resp.text}")

        access_token = token_resp.json().get("access_token")
        if not access_token:
            raise OAuthError("LinkedIn did not return an access token.")

        profile_resp = client.get(
            "https://api.linkedin.com/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if profile_resp.status_code != 200:
            raise OAuthError(f"LinkedIn profile fetch failed: {profile_resp.text}")

    profile = profile_resp.json()
    email = profile.get("email")
    sub = profile.get("sub")
    if not email or not sub:
        raise OAuthError("LinkedIn profile missing email or subject.")

    return {
        "email": str(email).lower(),
        "linkedin_id": str(sub),
        "name": profile.get("name") or email.split("@")[0],
        "picture": profile.get("picture"),
    }
