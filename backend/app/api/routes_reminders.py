from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.models.reminder import Reminder
from app.models.call_record import CallRecord
from app.schemas.reminder import ReminderCreate, ReminderUpdate, ReminderResponse
from app.services.scheduler import schedule_jobs_for_reminder, cancel_jobs_for_reminder

router = APIRouter(prefix="/api/reminders", tags=["Reminders"])

def calculate_auto_priority(due_datetime: datetime, ref_now: datetime) -> str:
    diff = due_datetime - ref_now
    days = diff.total_seconds() / 86400.0
    if days <= 1.0:
        return "due_today"
    elif days <= 2.0:
        return "2_day"
    elif days <= 3.0:
        return "3_day"
    else:
        return "5_day"

def enrich_reminder_response(reminder: Reminder) -> ReminderResponse:
    return ReminderResponse(
        id=reminder.id,
        call_record_id=reminder.call_record_id,
        phone_number=reminder.call_record.phone_number if reminder.call_record else None,
        call_datetime=reminder.call_record.call_datetime if reminder.call_record else None,
        task_title=reminder.task_title,
        voice_text=reminder.voice_text,
        due_datetime=reminder.due_datetime,
        timezone=reminder.timezone,
        priority=reminder.priority,
        completed=reminder.completed,
        completed_at=reminder.completed_at,
        created_at=reminder.created_at,
        updated_at=reminder.updated_at
    )

@router.get("", response_model=List[ReminderResponse])
def get_reminders(
    priority: Optional[str] = Query(None, description="Filter by priority"),
    completed: Optional[bool] = Query(None, description="Filter by completion status"),
    due_date: Optional[str] = Query(None, description="Filter by specific date YYYY-MM-DD"),
    phone: Optional[str] = Query(None, description="Filter by phone number"),
    search: Optional[str] = Query(None, description="Search across title, notes, phone"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(Reminder).join(Reminder.call_record, isouter=True)

    if priority:
        query = query.filter(Reminder.priority == priority.lower().strip())
    if completed is not None:
        query = query.filter(Reminder.completed == completed)
    if due_date:
        try:
            start_dt = datetime.strptime(due_date.strip(), "%Y-%m-%d")
            end_dt = start_dt + timedelta(days=1)
            query = query.filter(Reminder.due_datetime >= start_dt, Reminder.due_datetime < end_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid due_date format, expected YYYY-MM-DD")
    if phone:
        query = query.filter(CallRecord.phone_number.contains(phone.strip()))
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Reminder.task_title.ilike(s)) |
            (Reminder.voice_text.ilike(s)) |
            (CallRecord.phone_number.ilike(s))
        )

    reminders = query.order_by(Reminder.due_datetime.asc()).offset(skip).limit(limit).all()
    return [enrich_reminder_response(r) for r in reminders]

@router.post("", response_model=ReminderResponse, status_code=201)
def create_reminder(payload: ReminderCreate, db: Session = Depends(get_db)):
    call_record_id = payload.call_record_id

    # If phone_number is provided but no call_record_id, auto-link or create CallRecord
    if not call_record_id and payload.phone_number:
        clean_phone = payload.phone_number.strip()
        call_dt = payload.call_datetime or datetime.now(timezone.utc)
        record = CallRecord(
            phone_number=clean_phone,
            call_datetime=call_dt
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        call_record_id = record.id

    # Priority determination
    priority = payload.priority or "due_today"
    if payload.auto_priority:
        priority = calculate_auto_priority(payload.due_datetime, datetime.now(timezone.utc))

    reminder = Reminder(
        call_record_id=call_record_id,
        task_title=payload.task_title.strip(),
        voice_text=payload.voice_text.strip() if payload.voice_text else None,
        due_datetime=payload.due_datetime,
        timezone=payload.timezone or "Asia/Kolkata",
        priority=priority,
        completed=False
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    # Schedule notifications
    schedule_jobs_for_reminder(db, reminder)

    return enrich_reminder_response(reminder)

@router.get("/{reminder_id}", response_model=ReminderResponse)
def get_reminder(reminder_id: int, db: Session = Depends(get_db)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return enrich_reminder_response(reminder)

@router.patch("/{reminder_id}", response_model=ReminderResponse)
def update_reminder(reminder_id: int, payload: ReminderUpdate, db: Session = Depends(get_db)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    due_date_changed = False
    priority_changed = False
    completed_changed = False

    if payload.task_title is not None:
        reminder.task_title = payload.task_title.strip()
    if payload.voice_text is not None:
        reminder.voice_text = payload.voice_text.strip() if payload.voice_text else None
    if payload.due_datetime is not None:
        reminder.due_datetime = payload.due_datetime
        due_date_changed = True
    if payload.timezone is not None:
        reminder.timezone = payload.timezone
    if payload.priority is not None:
        reminder.priority = payload.priority
        priority_changed = True
    if payload.completed is not None:
        reminder.completed = payload.completed
        reminder.completed_at = datetime.now(timezone.utc) if payload.completed else None
        completed_changed = True

    db.commit()
    db.refresh(reminder)

    # Reschedule notification jobs if due date, priority, or completion status changed
    if due_date_changed or priority_changed or completed_changed:
        if reminder.completed:
            cancel_jobs_for_reminder(db, reminder.id)
        else:
            schedule_jobs_for_reminder(db, reminder)

    return enrich_reminder_response(reminder)

@router.post("/{reminder_id}/complete", response_model=ReminderResponse)
def complete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    # Toggle completion
    reminder.completed = not reminder.completed
    reminder.completed_at = datetime.now(timezone.utc) if reminder.completed else None
    
    db.commit()
    db.refresh(reminder)

    if reminder.completed:
        # Completed reminders must not trigger future notifications
        cancel_jobs_for_reminder(db, reminder.id)
    else:
        # Reopening reminder reschedules notifications
        schedule_jobs_for_reminder(db, reminder)

    return enrich_reminder_response(reminder)

@router.delete("/{reminder_id}", status_code=204)
def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    # Cancel pending jobs before deletion
    cancel_jobs_for_reminder(db, reminder.id)
    db.delete(reminder)
    db.commit()
    return None
