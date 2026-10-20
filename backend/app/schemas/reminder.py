from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import datetime
from typing import Optional
from enum import Enum

class PriorityEnum(str, Enum):
    EMERGENCY = "emergency"
    DUE_TODAY = "due_today"
    TWO_DAY = "2_day"
    THREE_DAY = "3_day"
    FIVE_DAY = "5_day"
    COMPLETED = "completed"

VALID_PRIORITIES = {"emergency", "due_today", "2_day", "3_day", "5_day", "completed"}

class ReminderBase(BaseModel):
    task_title: str = Field(..., min_length=1, max_length=255)
    voice_text: Optional[str] = None
    due_datetime: datetime
    timezone: str = "Asia/Kolkata"
    priority: str = "due_today"

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        v_clean = v.lower().strip()
        if v_clean not in VALID_PRIORITIES:
            raise ValueError(f"Priority must be one of: {VALID_PRIORITIES}")
        return v_clean

class ReminderCreate(BaseModel):
    phone_number: Optional[str] = None
    call_datetime: Optional[datetime] = None
    call_record_id: Optional[int] = None
    task_title: str = Field(..., min_length=1, max_length=255)
    voice_text: Optional[str] = None
    due_datetime: datetime
    timezone: str = "Asia/Kolkata"
    priority: Optional[str] = "due_today"
    auto_priority: Optional[bool] = False

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> str:
        if not v:
            return "due_today"
        v_clean = v.lower().strip()
        if v_clean not in VALID_PRIORITIES:
            raise ValueError(f"Priority must be one of: {VALID_PRIORITIES}")
        return v_clean

class ReminderUpdate(BaseModel):
    task_title: Optional[str] = None
    voice_text: Optional[str] = None
    due_datetime: Optional[datetime] = None
    timezone: Optional[str] = None
    priority: Optional[str] = None
    completed: Optional[bool] = None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v_clean = v.lower().strip()
        if v_clean not in VALID_PRIORITIES:
            raise ValueError(f"Priority must be one of: {VALID_PRIORITIES}")
        return v_clean

class ReminderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    call_record_id: Optional[int] = None
    phone_number: Optional[str] = None
    call_datetime: Optional[datetime] = None
    task_title: str
    voice_text: Optional[str] = None
    due_datetime: datetime
    timezone: str
    priority: str
    completed: bool
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
