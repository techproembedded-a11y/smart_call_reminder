from datetime import datetime, timezone, timedelta
from app.models.notification import NotificationJob, PushSubscription
from app.models.reminder import Reminder
from app.services.scheduler import schedule_jobs_for_reminder, cancel_jobs_for_reminder

def test_vapid_public_key_endpoint(client):
    res = client.get("/api/notifications/vapid-public-key")
    assert res.status_code == 200
    assert "public_key" in res.json()
    assert len(res.json()["public_key"]) > 20

def test_push_subscription_lifecycle(client):
    sub_payload = {
        "endpoint": "https://fcm.googleapis.com/fcm/send/test_sub_endpoint_123",
        "keys": {
            "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0448G3D55QA==",
            "auth": "tBHItJI5svbpez7KI4CCXg=="
        },
        "user_agent": "Mozilla/5.0 (Test Client)"
    }

    # Subscribe
    sub_res = client.post("/api/notifications/subscribe", json=sub_payload)
    assert sub_res.status_code == 200
    assert sub_res.json()["id"] is not None

    # Unsubscribe
    unsub_res = client.request(
        "DELETE",
        "/api/notifications/subscribe",
        json={"endpoint": sub_payload["endpoint"], "keys": sub_payload["keys"]}
    )
    assert unsub_res.status_code == 200
    assert unsub_res.json()["status"] == "unsubscribed"

def test_emergency_creates_immediate_notification_job(db_session):
    now = datetime.now(timezone.utc)
    reminder = Reminder(
        task_title="Emergency server restart",
        due_datetime=now + timedelta(hours=1),
        priority="emergency",
        completed=False
    )
    db_session.add(reminder)
    db_session.commit()
    db_session.refresh(reminder)

    jobs = schedule_jobs_for_reminder(db_session, reminder)
    assert len(jobs) == 1
    assert jobs[0].status == "PENDING"
    
    # Handle SQLite timezone-naive readback safely
    sched_at = jobs[0].scheduled_at
    if sched_at.tzinfo is None:
        sched_at = sched_at.replace(tzinfo=timezone.utc)
    assert abs((sched_at - now).total_seconds()) < 5

def test_five_day_reminder_scheduling(db_session):
    now = datetime.now(timezone.utc)
    due = now + timedelta(days=7)
    reminder = Reminder(
        task_title="Quotation followup in 5 days",
        due_datetime=due,
        priority="5_day",
        completed=False
    )
    db_session.add(reminder)
    db_session.commit()
    db_session.refresh(reminder)

    jobs = schedule_jobs_for_reminder(db_session, reminder)
    # Should create 2 jobs: 5 days before due date + at due date
    assert len(jobs) == 2
    assert all(j.status == "PENDING" for j in jobs)

def test_completion_cancels_pending_notification_jobs(db_session):
    now = datetime.now(timezone.utc)
    reminder = Reminder(
        task_title="Deliver design mockup",
        due_datetime=now + timedelta(days=2),
        priority="2_day",
        completed=False
    )
    db_session.add(reminder)
    db_session.commit()
    db_session.refresh(reminder)

    jobs = schedule_jobs_for_reminder(db_session, reminder)
    assert len(jobs) >= 1
    assert all(j.status == "PENDING" for j in jobs)

    # Mark completed
    reminder.completed = True
    db_session.commit()
    cancel_jobs_for_reminder(db_session, reminder.id)

    # Verify all jobs are now CANCELLED
    db_jobs = db_session.query(NotificationJob).filter(NotificationJob.reminder_id == reminder.id).all()
    assert all(j.status == "CANCELLED" for j in db_jobs)

def test_rescheduling_due_date_reschedules_jobs(db_session):
    now = datetime.now(timezone.utc)
    reminder = Reminder(
        task_title="Reschedule demo call",
        due_datetime=now + timedelta(days=3),
        priority="3_day",
        completed=False
    )
    db_session.add(reminder)
    db_session.commit()
    db_session.refresh(reminder)

    schedule_jobs_for_reminder(db_session, reminder)
    initial_jobs = db_session.query(NotificationJob).filter(NotificationJob.reminder_id == reminder.id).all()
    assert any(j.status == "PENDING" for j in initial_jobs)

    # Change due date to 10 days out
    reminder.due_datetime = now + timedelta(days=10)
    db_session.commit()
    schedule_jobs_for_reminder(db_session, reminder)

    # Old jobs should be cancelled and new pending jobs created
    cancelled_jobs = db_session.query(NotificationJob).filter(
        NotificationJob.reminder_id == reminder.id,
        NotificationJob.status == "CANCELLED"
    ).all()
    assert len(cancelled_jobs) > 0
    active_jobs = db_session.query(NotificationJob).filter(
        NotificationJob.reminder_id == reminder.id,
        NotificationJob.status == "PENDING"
    ).all()
    assert len(active_jobs) > 0
