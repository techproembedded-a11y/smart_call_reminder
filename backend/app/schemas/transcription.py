from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class TranscriptionResponse(BaseModel):
    text: str
    provider: str
    language: Optional[str] = None
    duration_seconds: Optional[float] = None
    status: str = "success"
    message: Optional[str] = None

class SmartExtractionRequest(BaseModel):
    transcript: str = Field(..., min_length=1)
    phone_number: Optional[str] = None
    call_datetime: Optional[datetime] = None
    timezone: Optional[str] = "Asia/Kolkata"

class SmartExtractionResponse(BaseModel):
    task_title: str
    phone_number: Optional[str] = None
    due_datetime: datetime
    priority: str
    confidence: float
    notes: Optional[str] = None
    explanation: Optional[str] = None
