import asyncio
import logging
import threading
import time
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from pywebpush import WebPushException

from app.database import SessionLocal
from app.models.reminder import Reminder
from app.models.notification import NotificationJob, PushSubscription
from app.services.push_service import send_web_push

logger = logging.getLogger(__name__)

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def schedule_jobs_for_reminder(db: Session, reminder: Reminder) -> List[NotificationJob]:
    """
    Calculates and persists NotificationJob records based on the reminder's priority and due date.
    Requirements:
    - Emergency: immediate notification job (scheduled_at = now).
    - Due today / 1-day: notification at due_datetime (or lead time).
    - 2-day reminder: lead notification 2 days before due date + at due date.
    - 3-day reminder: lead notification 3 days before due date + at due date.
    - 5-day reminder: lead notification 5 days before due date + at due date.
    """
    # Cancel any existing PENDING jobs for this reminder first
    cancel_jobs_for_reminder(db, reminder.id)

    if reminder.completed:
        return []

    now = utc_now()
    due = reminder.due_datetime
    if due.tzinfo is None:
        due = due.replace(tzinfo=timezone.utc)

    jobs_to_create = []

    if reminder.priority == "emergency":
        # Immediate alert
        jobs_to_create.append(NotificationJob(
            reminder_id=reminder.id,
            scheduled_at=now,
            status="PENDING"
        ))
    elif reminder.priority == "due_today":
        # At due time
        scheduled_time = due
        jobs_to_create.append(NotificationJob(
            reminder_id=reminder.id,
            scheduled_at=scheduled_time,
            status="PENDING"
        ))
    elif reminder.priority in ("2_day", "3_day", "5_day"):
        days_lead = 2 if reminder.priority == "2_day" else (3 if reminder.priority == "3_day" else 5)
        lead_time = due - timedelta(days=days_lead)
        
        # If lead time is in the future, schedule lead reminder
        if lead_time > now:
            jobs_to_create.append(NotificationJob(
                reminder_id=reminder.id,
                scheduled_at=lead_time,
                status="PENDING"
            ))
        
        # Also schedule at due time
        jobs_to_create.append(NotificationJob(
            reminder_id=reminder.id,
            scheduled_at=due,
            status="PENDING"
        ))
    else:
        # Default fallback
        jobs_to_create.append(NotificationJob(
            reminder_id=reminder.id,
            scheduled_at=due,
            status="PENDING"
        ))

    for job in jobs_to_create:
        db.add(job)
    
    db.commit()
    return jobs_to_create

def cancel_jobs_for_reminder(db: Session, reminder_id: int):
    """
    Cancels all pending notification jobs for a reminder when completed or updated.
    """
    pending_jobs = db.query(NotificationJob).filter(
        NotificationJob.reminder_id == reminder_id,
        NotificationJob.status == "PENDING"
    ).all()

    for job in pending_jobs:
        job.status = "CANCELLED"
    db.commit()

def process_pending_notifications(db: Session) -> int:
    """
    Evaluates all pending jobs where scheduled_at <= now().
    Dispatches web push notifications to all active subscriptions.
    """
    now = utc_now()
    pending_jobs = (
        db.query(NotificationJob)
        .filter(
            NotificationJob.status == "PENDING",
            NotificationJob.scheduled_at <= now
        )
        .all()
    )

    if not pending_jobs:
        return 0

    subscriptions = db.query(PushSubscription).all()
    dispatched_count = 0

    for job in pending_jobs:
        reminder: Reminder = job.reminder
        if not reminder or reminder.completed:
            job.status = "CANCELLED"
            db.commit()
            continue

        # Prepare payload
        payload = {
            "title": f"🚨 {reminder.task_title}" if reminder.priority == "emergency" else f"Reminder: {reminder.task_title}",
            "body": f"Due: {reminder.due_datetime.strftime('%Y-%m-%d %H:%M')} | Priority: {reminder.priority.replace('_', ' ').title()}",
            "data": {
                "reminder_id": reminder.id,
                "priority": reminder.priority,
                "due_datetime": reminder.due_datetime.isoformat(),
                "phone_number": reminder.call_record.phone_number if reminder.call_record else None
            }
        }

        # If no subscriptions exist, we still mark attempt and keep pending or set status
        if not subscriptions:
            logger.info(f"No active push subscriptions to send notification for reminder {reminder.id}. Waiting for client subscription.")
            # Note: We do not fail the job if no device is registered yet, but after 5 checks we mark sent/in-app overdue
            job.attempt_count += 1
            if job.attempt_count >= 10:
                job.status = "SENT"  # marked sent so it shows in in-app overdue without looping
                job.sent_at = now
            db.commit()
            continue

        any_success = False
        expired_sub_ids = []

        for sub in subscriptions:
            sub_info = {
                "endpoint": sub.subscription_endpoint,
                "keys": {
                    "p256dh": sub.p256dh_key,
                    "auth": sub.auth_key
                }
            }
            try:
                send_web_push(sub_info, payload)
                any_success = True
            except WebPushException as ex:
                if ex.response is not None and ex.response.status_code in (404, 410):
                    logger.info(f"Subscription expired: {sub.id}. Marking for removal.")
                    expired_sub_ids.append(sub.id)
                else:
                    logger.warning(f"Push delivery failed for subscription {sub.id}: {ex}")
            except Exception as ex:
                logger.warning(f"Error delivering push to sub {sub.id}: {ex}")

        # Clean up dead subscriptions
        if expired_sub_ids:
            db.query(PushSubscription).filter(PushSubscription.id.in_(expired_sub_ids)).delete(synchronize_session=False)

        job.attempt_count += 1
        if any_success:
            job.status = "SENT"
            job.sent_at = now
            dispatched_count += 1
        else:
            if job.attempt_count >= 3:
                job.status = "FAILED"
                job.last_error = "Exceeded maximum delivery attempts"

        db.commit()

    return dispatched_count


# Background thread worker
class NotificationWorker:
    def __init__(self, interval_seconds: int = 15):
        self.interval = interval_seconds
        self.running = False
        self.thread: Optional[threading.Thread] = None

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()
        logger.info("NotificationWorker background thread started.")

    def stop(self):
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2)
        logger.info("NotificationWorker background thread stopped.")

    def _run(self):
        while self.running:
            try:
                db: Session = SessionLocal()
                try:
                    process_pending_notifications(db)
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"Error in NotificationWorker cycle: {e}")
            time.sleep(self.interval)

notification_worker = NotificationWorker()
