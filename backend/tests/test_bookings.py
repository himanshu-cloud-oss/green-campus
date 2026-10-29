"""Unit and integration tests for extra class bookings and conflict detection."""
import pytest
from datetime import date, time
from app.models.models import Classroom, ExtraClassBooking


def test_create_booking_success(client, db):
    """Test creating an extra class booking during a vacant window."""
    room = db.query(Classroom).filter(Classroom.name == "LS-03").first()
    target_date = "2025-01-06"  # Monday

    # LS-03 is vacant during Period 4: 10:40 to 11:30
    payload = {
        "classroom_id": room.id,
        "date": target_date,
        "start_time": "10:40:00",
        "end_time": "11:30:00",
        "subject": "Advanced Quantum Computing Workshop",
        "expected_students": 45,
        "notes": "Dean-approved guest lecture",
    }
    r = client.post("/api/bookings", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["subject"] == "Advanced Quantum Computing Workshop"
    assert data["status"] == "ACTIVE"


def test_booking_conflict_with_regular_timetable(client, db):
    """Test that booking during a regular scheduled lecture returns 409 Conflict."""
    room = db.query(Classroom).filter(Classroom.name == "LS-03").first()
    target_date = "2025-01-06"  # Monday

    # LS-03 has regular class during Period 1: 08:10 to 09:00
    payload = {
        "classroom_id": room.id,
        "date": target_date,
        "start_time": "08:15:00",
        "end_time": "08:50:00",
        "subject": "Conflicting Revision Session",
        "expected_students": 30,
    }
    r = client.post("/api/bookings", json=payload)
    assert r.status_code == 409
    assert "conflict with regular timetable class" in r.json()["detail"].lower()


def test_booking_conflict_with_another_booking(client, db):
    """Test that overlapping ad-hoc bookings return 409 Conflict."""
    room = db.query(Classroom).filter(Classroom.name == "LS-04").first()
    # Sunday has no regular timetable classes
    target_date = "2025-01-12"

    payload1 = {
        "classroom_id": room.id,
        "date": target_date,
        "start_time": "14:00:00",
        "end_time": "16:00:00",
        "subject": "Hackathon Mentoring",
        "expected_students": 35,
    }
    r1 = client.post("/api/bookings", json=payload1)
    assert r1.status_code == 201

    # Attempt overlapping booking: 15:00 to 17:00
    payload2 = {
        "classroom_id": room.id,
        "date": target_date,
        "start_time": "15:00:00",
        "end_time": "17:00:00",
        "subject": "Robotics Club Assembly",
        "expected_students": 25,
    }
    r2 = client.post("/api/bookings", json=payload2)
    assert r2.status_code == 409
    assert "conflict with existing booking" in r2.json()["detail"].lower()


def test_booking_invalid_times(client, db):
    """Verify validation error when start_time >= end_time."""
    room = db.query(Classroom).first()
    payload = {
        "classroom_id": room.id,
        "date": "2025-01-15",
        "start_time": "14:00:00",
        "end_time": "13:00:00",  # Invalid!
        "subject": "Invalid Chronology Class",
    }
    r = client.post("/api/bookings", json=payload)
    assert r.status_code == 422


def test_cancel_booking_soft_delete(client, db):
    """Verify soft-cancellation sets status=CANCELLED without removing row."""
    room = db.query(Classroom).filter(Classroom.name == "LS-08").first()
    target_date = "2025-01-19"  # Sunday

    payload = {
        "classroom_id": room.id,
        "date": target_date,
        "start_time": "10:00:00",
        "end_time": "11:00:00",
        "subject": "To Be Cancelled",
    }
    r_create = client.post("/api/bookings", json=payload)
    assert r_create.status_code == 201
    booking_id = r_create.json()["id"]

    # Cancel via DELETE
    r_cancel = client.delete(f"/api/bookings/{booking_id}")
    assert r_cancel.status_code == 200
    assert r_cancel.json()["status"] == "CANCELLED"

    # Verify query
    r_get = client.get(f"/api/bookings/{booking_id}")
    assert r_get.status_code == 200
    assert r_get.json()["status"] == "CANCELLED"
