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
    try:
        result = cloudinary.uploader.upload(file)
        url = result.get("secure_url")
        if url:
            print(f"[Cloudinary] Upload successful: {url}")
        return url
    except Exception as e:
        print(f"[Cloudinary] CRITICAL UPLOAD ERROR: {str(e)}")
        raise e
