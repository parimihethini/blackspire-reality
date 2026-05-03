import os
import cloudinary
import cloudinary.uploader

# Configuration
CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
API_KEY = os.getenv("CLOUDINARY_API_KEY")
API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

print(f"[Cloudinary] Config: CLOUD_NAME={'SET' if CLOUD_NAME else 'MISSING'}, API_KEY={'SET' if API_KEY else 'MISSING'}, API_SECRET={'SET' if API_SECRET else 'MISSING'}")

cloudinary.config(
    cloud_name=CLOUD_NAME,
    api_key=API_KEY,
    api_secret=API_SECRET
)

def upload_image(file):
    """
    Uploads a file to Cloudinary and returns the secure URL.
    Handles both file objects and paths.
    """
    try:
        # result = cloudinary.uploader.upload(file, folder="profile_images")
        result = cloudinary.uploader.upload(file)
        return result.get("secure_url")
    except Exception as e:
        print("Cloudinary upload error:", e)
        return None
