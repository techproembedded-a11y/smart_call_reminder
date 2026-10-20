from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from collections import defaultdict

from app.database import get_db
from app.models.reminder import Reminder
from app.schemas.dashboard import DashboardStatsResponse, CalendarDayGroup
from app.schemas.reminder import ReminderResponse
from app.api.routes_reminders import enrich_reminder_response

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    start_of_today = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)
    end_of_today = start_of_today + timedelta(days=1)

    total_reminders = db.query(Reminder).count()
    completed_tasks = db.query(Reminder).filter(Reminder.completed == True).count()
    
    emergency_tasks = db.query(Reminder).filter(
        Reminder.priority == "emergency",
        Reminder.completed == False
    ).count()

    today_reminders = db.query(Reminder).filter(
        Reminder.due_datetime >= start_of_today,
        Reminder.due_datetime < end_of_today,
        Reminder.completed == False
    ).count()

    overdue_tasks = db.query(Reminder).filter(
        Reminder.due_datetime < now,
        Reminder.completed == False
    ).count()

    upcoming_reminders = db.query(Reminder).filter(
        Reminder.due_datetime >= now,
        Reminder.completed == False
    ).count()

    return DashboardStatsResponse(
        total_reminders=total_reminders,
        today_reminders=today_reminders,
        emergency_tasks=emergency_tasks,
        overdue_tasks=overdue_tasks,
        upcoming_reminders=upcoming_reminders,
        completed_tasks=completed_tasks
    )

@router.get("/calendar", response_model=List[CalendarDayGroup])
def get_calendar_events(
    month: str = Query(..., description="Format YYYY-MM"),
    db: Session = Depends(get_db)
):
    try:
        parts = month.strip().split("-")
        year = int(parts[0])
        mo = int(parts[1])
        start_date = datetime(year, mo, 1, 0, 0, 0, tzinfo=timezone.utc)
        if mo == 12:
            end_date = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        else:
            end_date = datetime(year, mo + 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    except Exception:
        # Default to current month
        now = datetime.now(timezone.utc)
        start_date = datetime(now.year, now.month, 1, 0, 0, 0, tzinfo=timezone.utc)
        end_date = datetime(now.year + (1 if now.month == 12 else 0), 1 if now.month == 12 else now.month + 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    reminders = (
        db.query(Reminder)
        .filter(Reminder.due_datetime >= start_date, Reminder.due_datetime < end_date)
        .order_by(Reminder.due_datetime.asc())
        .all()
    )

    now = datetime.now(timezone.utc)
    days_map = defaultdict(list)
    for r in reminders:
        day_str = r.due_datetime.strftime("%Y-%m-%d")
        days_map[day_str].append(r)

    result = []
    for day_str, r_list in days_map.items():
        has_emergency = any(r.priority == "emergency" and not r.completed for r in r_list)
        has_overdue = any(
            (r.due_datetime.replace(tzinfo=timezone.utc) if r.due_datetime.tzinfo is None else r.due_datetime) < now
            and not r.completed
            for r in r_list
        )
        result.append(CalendarDayGroup(
            date=day_str,
            count=len(r_list),
            has_emergency=has_emergency,
            has_overdue=has_overdue,
            reminders=[enrich_reminder_response(r) for r in r_list]
        ))

    result.sort(key=lambda x: x.date)
    return result
