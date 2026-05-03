import os
import cloudinary
import cloudinary.uploader

# Configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
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
