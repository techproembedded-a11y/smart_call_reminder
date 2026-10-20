from datetime import datetime, timezone, timedelta

def test_dashboard_stats_calculation(client):
    now = datetime.now(timezone.utc)

    # 1. Emergency reminder
    client.post("/api/reminders", json={
        "task_title": "Urgent server patch",
        "due_datetime": (now + timedelta(hours=1)).isoformat(),
        "priority": "emergency"
    })

    # 2. Today reminder
    client.post("/api/reminders", json={
        "task_title": "Call accountant",
        "due_datetime": (now + timedelta(hours=4)).isoformat(),
        "priority": "due_today"
    })

    # 3. Future reminder
    client.post("/api/reminders", json={
        "task_title": "Schedule team sync",
        "due_datetime": (now + timedelta(days=4)).isoformat(),
        "priority": "5_day"
    })

    res = client.get("/api/dashboard/stats")
    assert res.status_code == 200
    data = res.json()
    assert data["total_reminders"] >= 3
    assert data["emergency_tasks"] >= 1
    assert data["today_reminders"] >= 1

def test_calendar_events_grouping(client):
    now = datetime.now(timezone.utc)
    target_dt = datetime(now.year, now.month, 15, 14, 0, 0, tzinfo=timezone.utc)

    client.post("/api/reminders", json={
        "task_title": "Mid-month review",
        "due_datetime": target_dt.isoformat(),
        "priority": "due_today"
    })

    month_str = f"{now.year}-{str(now.month).zfill(2)}"
    res = client.get(f"/api/dashboard/calendar?month={month_str}")
    assert res.status_code == 200
    groups = res.json()
    assert isinstance(groups, list)
    
    target_date_str = target_dt.strftime("%Y-%m-%d")
    matched = [g for g in groups if g["date"] == target_date_str]
    assert len(matched) == 1
    assert matched[0]["count"] >= 1
    assert matched[0]["reminders"][0]["task_title"] == "Mid-month review"

def test_404_error_handling(client):
    res_call = client.get("/api/calls/999999")
    assert res_call.status_code == 404
    assert "not found" in res_call.json()["detail"].lower()

    res_rem = client.get("/api/reminders/999999")
    assert res_rem.status_code == 404
    assert "not found" in res_rem.json()["detail"].lower()
