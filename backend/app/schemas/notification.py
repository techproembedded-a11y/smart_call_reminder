from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class PushKeys(BaseModel):
    p256dh: str
    auth: str

class PushSubscriptionCreate(BaseModel):
    endpoint: str = Field(..., description="Browser Push Service Endpoint URL")
    keys: PushKeys
    user_agent: Optional[str] = None

class PushSubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subscription_endpoint: str
    created_at: datetime

class PushTestRequest(BaseModel):
    title: Optional[str] = "Smart Call Reminder Test"
    body: Optional[str] = "Push notification service is active and working!"

class NotificationJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reminder_id: int
    scheduled_at: datetime
    sent_at: Optional[datetime] = None
    status: str
    attempt_count: int
    last_error: Optional[str] = None
    created_at: datetime
