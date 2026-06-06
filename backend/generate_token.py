from google_auth_oauthlib.flow import InstalledAppFlow
import pickle

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")

with open("token.pickle", "wb") as token:
    pickle.dump(creds, token)

print("Token created successfully!")
print("Upload to Render:")
print("  GOOGLE_TOKEN_BASE64 = base64 of token.pickle")
print("  GOOGLE_CREDENTIALS_BASE64 = base64 of credentials.json")
