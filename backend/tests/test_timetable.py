"""Unit and integration tests for timetable periods, lunch detection, and weekday filtering."""
import pytest
from datetime import time, date
from app.services.timetable_service import (
    get_all_periods,
    get_current_period,
    is_lunch_period,
    get_timetable_entry,
    get_occupancy_status,
)
from app.models.models import Classroom


def test_periods_definition():
    """Verify period timetable count and lunch break designation."""
    periods = get_all_periods()
    assert len(periods) == 10
    lunch = next(p for p in periods if p["period_number"] == "LUNCH")
    assert lunch["start_time"] == "11:30"
    assert lunch["end_time"] == "12:20"
    assert lunch["is_lunch"] is True


def test_period_lookup_and_boundaries():
    """Test period resolution across various times of day."""
    # Period 1: 08:10 - 09:00
    p1 = get_current_period(time(8, 15))
    assert p1 is not None
    assert p1["period_number"] == "1"

    # Exact boundary start of Period 2: 09:00
    p2 = get_current_period(time(9, 0))
    assert p2 is not None
    assert p2["period_number"] == "2"

    # Boundary cases: before campus start (07:45)
    before_hours = get_current_period(time(7, 45))
    assert before_hours is None

    # Boundary cases: after campus close (17:00)
    after_hours = get_current_period(time(17, 0))
    assert after_hours is None


def test_lunch_period_detection():
    """Verify lunch break identification."""
    assert is_lunch_period(time(11, 45)) is True
    assert is_lunch_period(time(11, 30)) is True
    assert is_lunch_period(time(12, 19, 59)) is True
    assert is_lunch_period(time(12, 20)) is False  # Period 6 starts at 12:20
    assert is_lunch_period(time(10, 0)) is False


def test_timetable_lookup_and_weekday_filtering(db):
    """Test timetable entry lookup by classroom and weekday."""
    room = db.query(Classroom).filter(Classroom.name == "LS-03").first()
    assert room is not None

    # Lookup period 1 on Monday at 08:30
    entry_mon = get_timetable_entry(room.id, "MON", time(8, 30), db)
    assert entry_mon is not None
    assert entry_mon.classroom_id == room.id
    assert entry_mon.demo_data is True

    # Lookup when vacant (LS-03 is intentionally vacant during Period 4: 10:40 - 11:30)
    vacant_entry = get_timetable_entry(room.id, "MON", time(10, 50), db)
    assert vacant_entry is None


def test_occupancy_status_states(db):
    """Test occupancy status during class, vacant periods, and lunch."""
    room = db.query(Classroom).filter(Classroom.name == "LS-03").first()
    target_date = date(2025, 1, 6)  # A Monday

    # 1. During class (08:30)
    stat_occupied = get_occupancy_status(room.id, "MON", time(8, 30), target_date, db)
    assert stat_occupied["status"] == "OCCUPIED"

    # 2. During lunch (11:45)
    stat_lunch = get_occupancy_status(room.id, "MON", time(11, 45), target_date, db)
    assert stat_lunch["status"] == "LUNCH"

    # 3. During vacant period 4 (10:50)
    stat_vacant = get_occupancy_status(room.id, "MON", time(10, 50), target_date, db)
    assert stat_vacant["status"] == "VACANT"

    # 4. After hours (18:00)
    stat_after = get_occupancy_status(room.id, "MON", time(18, 0), target_date, db)
    assert stat_after["status"] == "AFTER_HOURS"


def test_timetable_api_endpoints(client):
    """Verify HTTP API endpoints for timetable and current status."""
    r_periods = client.get("/api/timetable/periods")
    assert r_periods.status_code == 200
    assert len(r_periods.json()) == 10

    # Filter timetable by weekday
    r_tt = client.get("/api/timetable?weekday=MON")
    assert r_tt.status_code == 200
    assert len(r_tt.json()) > 0

    # Current evaluation
    r_curr = client.get("/api/timetable/current?date=2025-01-06&time=08:30:00")
    assert r_curr.status_code == 200
    assert "classrooms" in r_curr.json()
