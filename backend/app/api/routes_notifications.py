from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.notification import PushSubscription
from app.schemas.notification import PushSubscriptionCreate, PushSubscriptionResponse, PushTestRequest
from app.services.push_service import get_vapid_keys, send_web_push

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("/vapid-public-key")
def get_public_vapid_key():
    """
    Returns the VAPID public key needed by the browser to subscribe to Web Push.
    """
    keys = get_vapid_keys()
    return {"public_key": keys["public_key"]}

@router.post("/subscribe", response_model=PushSubscriptionResponse)
def register_push_subscription(payload: PushSubscriptionCreate, db: Session = Depends(get_db)):
    """
    Registers or updates the browser's PushSubscription.
    """
    endpoint = payload.endpoint.strip()
    sub = db.query(PushSubscription).filter(PushSubscription.subscription_endpoint == endpoint).first()

    if sub:
        # Update keys if needed
        sub.p256dh_key = payload.keys.p256dh
        sub.auth_key = payload.keys.auth
        sub.user_agent = payload.user_agent
    else:
        sub = PushSubscription(
            subscription_endpoint=endpoint,
            p256dh_key=payload.keys.p256dh,
            auth_key=payload.keys.auth,
            user_agent=payload.user_agent
        )
        db.add(sub)

    db.commit()
    db.refresh(sub)
    return sub

@router.delete("/subscribe")
def unregister_push_subscription(payload: PushSubscriptionCreate, db: Session = Depends(get_db)):
    """
    Unregisters a browser push subscription.
    """
    endpoint = payload.endpoint.strip()
    sub = db.query(PushSubscription).filter(PushSubscription.subscription_endpoint == endpoint).first()
    if sub:
        db.delete(sub)
        db.commit()
    return {"status": "unsubscribed"}

@router.post("/test")
def send_test_notification(payload: PushTestRequest, db: Session = Depends(get_db)):
    """
    Dispatches a test notification to all registered subscriptions.
    """
    subs = db.query(PushSubscription).all()
    if not subs:
        return {
            "success": False,
            "message": "No active push subscriptions found on server. Please enable notifications in your browser first.",
            "dispatched": 0
        }

    dispatched = 0
    errors = []

    for sub in subs:
        sub_info = {
            "endpoint": sub.subscription_endpoint,
            "keys": {
                "p256dh": sub.p256dh_key,
                "auth": sub.auth_key
            }
        }
        msg_payload = {
            "title": payload.title or "🔔 Smart Call Reminder",
            "body": payload.body or "Test notification delivered successfully!",
            "data": {"type": "test"}
        }
        try:
            send_web_push(sub_info, msg_payload)
            dispatched += 1
        except Exception as e:
            errors.append(str(e))

    return {
        "success": dispatched > 0,
        "dispatched": dispatched,
        "total_subscriptions": len(subs),
        "errors": errors if errors else None
    }
