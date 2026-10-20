from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.schemas.reminder import ReminderResponse

class DashboardStatsResponse(BaseModel):
    total_reminders: int
    today_reminders: int
    emergency_tasks: int
    overdue_tasks: int
    upcoming_reminders: int
    completed_tasks: int

class CalendarDayGroup(BaseModel):
    date: str  # YYYY-MM-DD
    count: int
    has_emergency: bool
    has_overdue: bool
    reminders: List[ReminderResponse] = []
