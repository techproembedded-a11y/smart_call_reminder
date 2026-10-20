from datetime import datetime, timezone

def test_create_call_record(client):
    response = client.post("/api/calls", json={
        "phone_number": "+91 98765 43210",
        "call_datetime": datetime.now(timezone.utc).isoformat()
    })
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    # Phone number should be normalized (whitespace stripped)
    assert data["phone_number"] == "+919876543210"

def test_create_call_record_invalid_phone(client):
    response = client.post("/api/calls", json={
        "phone_number": "12"
    })
    assert response.status_code == 422  # validation error

def test_get_call_records_and_filter(client):
    client.post("/api/calls", json={"phone_number": "+919876543210"})
    client.post("/api/calls", json={"phone_number": "+14155552671"})

    # Filter by phone
    res = client.get("/api/calls?phone=98765")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["phone_number"] == "+919876543210"

def test_update_and_delete_call_record(client):
    create_res = client.post("/api/calls", json={"phone_number": "+919999999999"})
    call_id = create_res.json()["id"]

    # Update
    patch_res = client.patch(f"/api/calls/{call_id}", json={"phone_number": "+918888888888"})
    assert patch_res.status_code == 200
    assert patch_res.json()["phone_number"] == "+918888888888"

    # Delete
    del_res = client.delete(f"/api/calls/{call_id}")
    assert del_res.status_code == 204

    # Verify not found
    get_res = client.get(f"/api/calls/{call_id}")
    assert get_res.status_code == 404
