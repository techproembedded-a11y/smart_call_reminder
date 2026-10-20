from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import datetime
from typing import Optional, List
import re

class CallRecordBase(BaseModel):
    phone_number: str = Field(..., description="E.164 or national phone number")
    call_datetime: datetime = Field(..., description="Call timestamp")

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        clean = re.sub(r"[\s\-\(\)]", "", v.strip())
        if not clean or len(clean) < 4:
            raise ValueError("Phone number must have at least 4 digits")
        return clean

class CallRecordCreate(BaseModel):
    phone_number: str = Field(..., min_length=4, max_length=32)
    call_datetime: Optional[datetime] = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        clean = re.sub(r"[\s\-\(\)]", "", v.strip())
        if not clean or len(clean) < 4:
            raise ValueError("Phone number must have at least 4 digits")
        return clean

class CallRecordUpdate(BaseModel):
    phone_number: Optional[str] = None
    call_datetime: Optional[datetime] = None

class ReminderBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_title: str
    due_datetime: datetime
    priority: str
    completed: bool

class CallRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone_number: str
    call_datetime: datetime
    created_at: datetime
    updated_at: datetime
    reminders: List[ReminderBrief] = []
