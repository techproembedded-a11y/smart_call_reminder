import io
import pytest
from datetime import datetime, timezone, timedelta
from app.services.reminder_extractor import extract_with_rules

def test_audio_upload_invalid_extension(client):
    file_content = b"fake executable binary"
    file = io.BytesIO(file_content)
    response = client.post(
        "/api/transcription",
        files={"file": ("malicious.exe", file, "application/octet-stream")}
    )
    assert response.status_code == 400
    assert "Unsupported audio format" in response.json()["detail"]

def test_audio_upload_unconfigured_stt_graceful(client):
    # Valid webm audio file payload
    file_content = b"RIFF....WAVEfmt ...."
    file = io.BytesIO(file_content)
    response = client.post(
        "/api/transcription",
        files={"file": ("voice_note.webm", file, "audio/webm")}
    )
    # Should not crash, returns 200 with informative message
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "provider" in data

def test_tanglish_extraction_quotation_five_days():
    ref_time = datetime(2026, 10, 20, 10, 0, 0, tzinfo=timezone.utc)
    transcript = "Ravi ku five days la quotation send pannanum."
    res = extract_with_rules(transcript, ref_time)
    
    assert res["task_title"] == "Send quotation"
    assert res["priority"] == "5_day"
    # Due date should be 5 days from ref_time
    diff_days = (res["due_datetime"] - ref_time).days
    assert diff_days == 5

def test_tanglish_extraction_emergency_today():
    ref_time = datetime(2026, 10, 20, 10, 0, 0, tzinfo=timezone.utc)
    transcript = "Emergency, innaikke mudikkanum."
    res = extract_with_rules(transcript, ref_time)

    assert res["priority"] == "emergency"
    assert "Emergency" in res["explanation"]

def test_tamil_extraction_tomorrow_call():
    ref_time = datetime(2026, 10, 20, 10, 0, 0, tzinfo=timezone.utc)
    transcript = "naalaikku call pannanum client kitta"
    res = extract_with_rules(transcript, ref_time)

    assert "Call" in res["task_title"]
    assert res["priority"] == "due_today"
    assert (res["due_datetime"] - ref_time).days == 1

def test_api_extract_reminder_endpoint(client):
    response = client.post("/api/extract-reminder", json={
        "transcript": "Ravi ku five days la quotation send pannanum",
        "phone_number": "+919876543210"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["task_title"] == "Send quotation"
    assert data["priority"] == "5_day"
    assert data["phone_number"] == "+919876543210"
