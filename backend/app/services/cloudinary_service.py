import os
import cloudinary
import cloudinary.uploader
from cloudinary.exceptions import Error as CloudinaryError, NotAllowed, BadRequest
import logging

logger = logging.getLogger(__name__)

# Configuration
CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
API_KEY = os.getenv("CLOUDINARY_API_KEY")
API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

logger.info(f"[Cloudinary] Config: CLOUD_NAME={'SET' if CLOUD_NAME else 'MISSING'}, API_KEY={'SET' if API_KEY else 'MISSING'}, API_SECRET={'SET' if API_SECRET else 'MISSING'}")

cloudinary.config(
    cloud_name=CLOUD_NAME,
    api_key=API_KEY,
    api_secret=API_SECRET
)

def upload_image(file, public_id=None):
    """
    Upload image to Cloudinary with proper error handling.
    
    Args:
        file: File content to upload
        public_id: Optional public ID for the image
        
    Returns:
        str: Secure URL of the uploaded image
        
    Raises:
        CloudinaryError: If upload fails
    """
    try:
        upload_params = {
            'resource_type': 'auto',
            'overwrite': True,
            'folder': 'blackspire/profile-images'
        }
        
        if public_id:
            upload_params['public_id'] = public_id
            
        logger.info(f"[Cloudinary] Attempting upload with params: {upload_params}")
        result = cloudinary.uploader.upload(file, **upload_params)
        url = result.get("secure_url")
        
        if url:
            logger.info(f"[Cloudinary] Upload successful: {url}")
        return url
        
    except NotAllowed as e:
        error_msg = f"[Cloudinary] Permission denied - API key may lack upload permissions: {str(e)}"
        logger.error(error_msg)
        raise CloudinaryError(error_msg)
        
    except BadRequest as e:
        error_msg = f"[Cloudinary] Bad request - Invalid file or parameters: {str(e)}"
        logger.error(error_msg)
        raise CloudinaryError(error_msg)
        
    except CloudinaryError as e:
        error_msg = f"[Cloudinary] Upload failed: {str(e)}"
        logger.error(error_msg)
        raise
        
    except Exception as e:
        error_msg = f"[Cloudinary] Unexpected error: {str(e)}"
        logger.error(error_msg)
        raise CloudinaryError(error_msg)
