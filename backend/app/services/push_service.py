import json
import logging
from typing import Dict, Any, Optional
from pywebpush import webpush, WebPushException
from py_vapid import Vapid
from app.config import settings

logger = logging.getLogger(__name__)

# Auto-generate or load VAPID keys if not specified
_ephemeral_vapid: Optional[Vapid] = None

def get_vapid_keys() -> Dict[str, str]:
    global _ephemeral_vapid
    if settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY:
        return {
            "public_key": settings.VAPID_PUBLIC_KEY,
            "private_key": settings.VAPID_PRIVATE_KEY,
            "claim_email": settings.VAPID_CLAIM_EMAIL
        }
    
    # If not set in environment, generate an in-memory VAPID keypair for local session/testing
    if _ephemeral_vapid is None:
        logger.warning("VAPID keys not configured in environment. Generating in-memory development keys.")
        _ephemeral_vapid = Vapid()
        _ephemeral_vapid.generate_keys()
    
    # In py-vapid, public_key is an EC point, export to urlsafe base64 string
    import base64
    from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat, PrivateFormat, NoEncryption
    
    pub_bytes = _ephemeral_vapid.public_key.public_bytes(
        encoding=Encoding.X962,
        format=PublicFormat.UncompressedPoint
    )
    b64_pub = base64.urlsafe_b64encode(pub_bytes).decode('utf-8').rstrip('=')

    priv_pem = _ephemeral_vapid.private_key.private_bytes(
        encoding=Encoding.PEM,
        format=PrivateFormat.PKCS8,
        encryption_algorithm=NoEncryption()
    ).decode('utf-8')

    return {
        "public_key": b64_pub,
        "private_key": priv_pem,
        "claim_email": settings.VAPID_CLAIM_EMAIL
    }

def send_web_push(subscription_info: Dict[str, Any], payload: Dict[str, Any]) -> bool:
    """
    Sends a web push notification to a browser subscription.
    Returns True on success, raises WebPushException on failure.
    """
    vapid_keys = get_vapid_keys()
    
    vapid_claims = {
        "sub": vapid_keys["claim_email"]
    }

    try:
        response = webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=vapid_keys["private_key"],
            vapid_claims=vapid_claims,
            ttl=3600
        )
        logger.info(f"Web push dispatched successfully. Status: {response.status_code if response else 'OK'}")
        return True
    except WebPushException as ex:
        logger.error(f"Failed to dispatch web push: {ex}")
        # Re-raise so caller can inspect status code (e.g., 404 or 410 Gone)
        raise ex
    except Exception as ex:
        logger.error(f"Unexpected error in web push: {ex}")
        raise ex
