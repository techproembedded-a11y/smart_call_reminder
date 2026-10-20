from datetime import datetime, timezone, timedelta

def test_create_reminder_with_auto_phone_link(client):
    due = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    response = client.post("/api/reminders", json={
        "phone_number": "+919876543210",
        "task_title": "Send project estimation",
        "voice_text": "Customer requested quotation for software upgrade",
        "due_datetime": due,
        "priority": "2_day"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["task_title"] == "Send project estimation"
    assert data["priority"] == "2_day"
    assert data["phone_number"] == "+919876543210"
    assert data["completed"] is False

def test_invalid_priority_rejected(client):
    due = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()
    response = client.post("/api/reminders", json={
        "phone_number": "+919876543210",
        "task_title": "Invalid priority test",
        "due_datetime": due,
        "priority": "ultra_super_urgent"
    })
    assert response.status_code == 422

def test_auto_priority_calculation(client):
    # Due in 5 hours -> should calculate as due_today
    due_today = (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat()
    res1 = client.post("/api/reminders", json={
        "task_title": "Today task",
        "due_datetime": due_today,
        "auto_priority": True
    })
    assert res1.status_code == 201
    assert res1.json()["priority"] == "due_today"

    # Due in 48 hours -> should calculate as 2_day
    due_2d = (datetime.now(timezone.utc) + timedelta(hours=40)).isoformat()
    res2 = client.post("/api/reminders", json={
        "task_title": "2 day task",
        "due_datetime": due_2d,
        "auto_priority": True
    })
    assert res2.status_code == 201
    assert res2.json()["priority"] == "2_day"

def test_complete_and_reopen_reminder(client):
    due = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    create_res = client.post("/api/reminders", json={
        "task_title": "Review NDA document",
        "due_datetime": due,
        "priority": "due_today"
    })
    rem_id = create_res.json()["id"]

    # Mark complete
    comp_res = client.post(f"/api/reminders/{rem_id}/complete")
    assert comp_res.status_code == 200
    assert comp_res.json()["completed"] is True
    assert comp_res.json()["completed_at"] is not None

    # Reopen
    reopen_res = client.post(f"/api/reminders/{rem_id}/complete")
    assert reopen_res.status_code == 200
    assert reopen_res.json()["completed"] is False
    assert reopen_res.json()["completed_at"] is None
