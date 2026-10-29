"""Timetable lookup, period resolution, and occupancy determination service."""
from datetime import time, date
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import TimetableEntry, ExtraClassBooking, DeviceState, Classroom


PERIODS: List[Dict[str, Any]] = [
    {"period_number": "1", "label": "Period 1", "start_time": "08:10", "end_time": "09:00", "is_lunch": False},
    {"period_number": "2", "label": "Period 2", "start_time": "09:00", "end_time": "09:50", "is_lunch": False},
    {"period_number": "3", "label": "Period 3", "start_time": "09:50", "end_time": "10:40", "is_lunch": False},
    {"period_number": "4", "label": "Period 4", "start_time": "10:40", "end_time": "11:30", "is_lunch": False},
    {"period_number": "LUNCH", "label": "Lunch Break", "start_time": "11:30", "end_time": "12:20", "is_lunch": True},
    {"period_number": "6", "label": "Period 6", "start_time": "12:20", "end_time": "13:10", "is_lunch": False},
    {"period_number": "7", "label": "Period 7", "start_time": "13:10", "end_time": "14:00", "is_lunch": False},
    {"period_number": "8", "label": "Period 8", "start_time": "14:00", "end_time": "14:50", "is_lunch": False},
    {"period_number": "9", "label": "Period 9", "start_time": "14:50", "end_time": "15:40", "is_lunch": False},
    {"period_number": "10", "label": "Period 10", "start_time": "15:40", "end_time": "16:30", "is_lunch": False},
]


def parse_time_str(val: str) -> time:
    """Parse HH:MM or HH:MM:SS string to a datetime.time object."""
    parts = [int(p) for p in val.strip().split(":")]
    if len(parts) == 2:
        return time(parts[0], parts[1], 0)
    elif len(parts) == 3:
        return time(parts[0], parts[1], parts[2])
    raise ValueError(f"Invalid time format: {val}")


def get_all_periods() -> List[Dict[str, Any]]:
    """Return all defined timetable period structures."""
    return PERIODS


def get_current_period(t: time) -> Optional[Dict[str, Any]]:
    """
    Find the timetable period definition that encompasses the provided time.
    Period boundaries are inclusive of start_time and exclusive of end_time.
    """
    for p in PERIODS:
        start_t = parse_time_str(p["start_time"])
        end_t = parse_time_str(p["end_time"])
        if start_t <= t < end_t:
            return p
    return None


def is_lunch_period(t: time) -> bool:
    """Check if the given time falls within the campus lunch break (11:30 - 12:20)."""
    p = get_current_period(t)
    if p and p.get("is_lunch"):
        return True
    lunch_start = time(11, 30, 0)
    lunch_end = time(12, 20, 0)
    return lunch_start <= t < lunch_end


def get_timetable_entry(
    classroom_id: int, weekday: str, t: time, db: Session
) -> Optional[TimetableEntry]:
    """
    Query the database for an active timetable entry for the given classroom, weekday, and time.
    """
    weekday_upper = weekday.strip().upper()
    # Normalize common abbreviations
    weekday_map = {
        "MONDAY": "MON",
        "TUESDAY": "TUE",
        "WEDNESDAY": "WED",
        "THURSDAY": "THU",
        "FRIDAY": "FRI",
        "SATURDAY": "SAT",
        "SUNDAY": "SUN",
    }
    weekday_code = weekday_map.get(weekday_upper, weekday_upper[:3])

    return (
        db.query(TimetableEntry)
        .filter(
            TimetableEntry.classroom_id == classroom_id,
            TimetableEntry.day_of_week == weekday_code,
            TimetableEntry.start_time <= t,
            TimetableEntry.end_time > t,
        )
        .first()
    )


def get_active_booking(
    classroom_id: int, target_date: date, t: time, db: Session
) -> Optional[ExtraClassBooking]:
    """Query active ad-hoc bookings for the classroom at the specified date and time."""
    return (
        db.query(ExtraClassBooking)
        .filter(
            ExtraClassBooking.classroom_id == classroom_id,
            ExtraClassBooking.date == target_date,
            ExtraClassBooking.status == "ACTIVE",
            ExtraClassBooking.start_time <= t,
            ExtraClassBooking.end_time > t,
        )
        .first()
    )


def get_occupancy_status(
    classroom_id: int,
    weekday: str,
    t: time,
    target_date: date,
    db: Session,
) -> Dict[str, Any]:
    """
    Determine the live occupancy status, active periods, and potential energy waste for a classroom.
    """
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    current_period = get_current_period(t)
    timetable_entry = get_timetable_entry(classroom_id, weekday, t, db)
    booking = get_active_booking(classroom_id, target_date, t, db)
    device_state = (
        db.query(DeviceState).filter(DeviceState.classroom_id == classroom_id).first()
    )

    # Determine status
    if is_lunch_period(t):
        status = "LUNCH"
    elif booking is not None:
        status = "BOOKED_EXTRA_CLASS"
    elif timetable_entry is not None:
        status = "OCCUPIED"
    elif current_period is None:
        status = "AFTER_HOURS"
    else:
        status = "VACANT"

    # Compute current electrical draw based on device states
    # Default loads: AC = 1.5 kW, Fan = 0.075 kW, Lights = 0.2 kW
    energy_draw_kw = 0.0
    if device_state:
        if device_state.ac_on:
            energy_draw_kw += 1.5
        if device_state.fan_on:
            energy_draw_kw += 0.075
        if device_state.lights_on:
            energy_draw_kw += 0.2
    else:
        # Fallback to connected load if occupied
        if status in ("OCCUPIED", "BOOKED_EXTRA_CLASS"):
            energy_draw_kw = classroom.connected_load_kw if classroom else 2.4

    # Detect unnecessary energy waste
    waste_detected = False
    waste_reason = None
    if status in ("VACANT", "LUNCH", "AFTER_HOURS") and energy_draw_kw > 0.0:
        waste_detected = True
        waste_reason = (
            f"Electrical loads running ({energy_draw_kw:.2f} kW) while room is {status.lower().replace('_', ' ')}"
        )

    return {
        "classroom_id": classroom_id,
        "name": classroom.name if classroom else f"Room {classroom_id}",
        "status": status,
        "current_period": current_period,
        "timetable_entry": timetable_entry,
        "active_booking": booking,
        "device_state": device_state,
        "energy_draw_kw": round(energy_draw_kw, 3),
        "waste_detected": waste_detected,
        "waste_reason": waste_reason,
    }
