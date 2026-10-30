"""Automatic room + slot allocation for unscheduled (extra) classes.

Given what's needed (students, duration, time window, equipment), find every free
room/slot and rank them by modelled energy cost, so the cheapest-to-run option wins:
  - session energy: the room's expected draw while occupied (bigger rooms cost more),
  - pre-cooling: a room that's idle beforehand must be cooled/lit first; a room with a
    class ending right at the start time is already running,
  - after-hours: holding a class after the floor closes keeps corridor/washroom loads on.
Small penalties prefer earlier slots and tighter capacity fits.
"""
from datetime import date, datetime, time, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.models import ExtraClassBooking, Setting, TimetableEntry
from app.services.telemetry_service import (
    COMMON_CLOSE,
    COMMON_OPEN,
    DAY_CODES,
    LUNCH_END,
    LUNCH_START,
    PRECOOL_MIN,
    FloorModel,
)
from app.services.timetable_service import PERIODS, parse_time_str
from app.clock import now_local

PERIOD_MIN = 50
EVENING_SLOTS = [time(16, 30), time(17, 20), time(18, 10)]


def _t(dt_time: time) -> int:
    return dt_time.hour * 60 + dt_time.minute


def _from_min(m: int) -> time:
    return time(m // 60, m % 60)


def _overlaps(a0: int, a1: int, b0: int, b1: int) -> bool:
    return a0 < b1 and b0 < a1


def _candidate_starts(window_start: time, window_end: time, duration: int, align: bool) -> List[int]:
    w0, w1 = _t(window_start), _t(window_end)
    if align:
        starts = [_t(parse_time_str(p["start_time"])) for p in PERIODS if not p["is_lunch"]]
        starts += [_t(s) for s in EVENING_SLOTS]
    else:
        starts = list(range(w0 - w0 % 10 + (10 if w0 % 10 else 0), w1, 10))
    return sorted(s for s in set(starts) if s >= w0 and s + duration <= w1)


def _tariff(db: Session) -> float:
    s = db.query(Setting).filter(Setting.key == "tariff_per_kwh").first()
    try:
        return float(s.value) if s else 8.5
    except ValueError:
        return 8.5


def find_slots(
    db: Session,
    *,
    start_date: date,
    search_days: int,
    window_start: time,
    window_end: time,
    duration_minutes: int,
    expected_students: int,
    needs: List[str],
    align_to_periods: bool,
    allow_lunch: bool,
    include_weekends: bool,
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    now = now or now_local()
    model = FloorModel(db)
    tariff = _tariff(db)
    needs_set = {n.upper() for n in needs}

    rooms, rejected = [], []
    for sp in model.spaces:
        if not sp.bookable or not sp.classroom_id:
            continue
        if (sp.capacity or 0) < expected_students:
            rejected.append({"room": sp.code, "reason": f"seats {sp.capacity} < {expected_students} students"})
            continue
        have = {a.device_type for a in sp.assets if a.quantity > 0} | {a.category for a in sp.assets if a.quantity > 0}
        missing = needs_set - have
        if missing:
            rejected.append({"room": sp.code, "reason": f"missing {', '.join(sorted(missing))}"})
            continue
        rooms.append(sp)

    common = [sp for sp in model.spaces if sp.kind in ("CORRIDOR", "WASHROOM", "COMMON")]
    starts = _candidate_starts(window_start, window_end, duration_minutes, align_to_periods)
    candidates: List[Dict[str, Any]] = []
    days_searched = []

    # search_days counts usable days: weekends are skipped without using up the count.
    offset = -1
    while len(days_searched) < search_days and offset < search_days + 30:
        offset += 1
        d = start_date + timedelta(days=offset)
        if d.weekday() >= 5 and not include_weekends:
            continue
        days_searched.append(d.isoformat())
        day_code = DAY_CODES[d.weekday()]
        for sp in rooms:
            cid = sp.classroom_id
            busy = [(_t(e.start_time), _t(e.end_time), "class") for e in model.timetable.get((cid, day_code), [])]
            busy += [(_t(b.start_time), _t(b.end_time), "booking") for b in model.bookings.get((cid, d), [])]
            for s0 in starts:
                s1 = s0 + duration_minutes
                if d == now.date() and s0 <= now.hour * 60 + now.minute + 5:
                    continue
                if any(_overlaps(s0, s1, b0, b1) for b0, b1, _ in busy):
                    continue
                if not allow_lunch and _overlaps(s0, s1, _t(LUNCH_START), _t(LUNCH_END)):
                    continue
                candidates.append(_score(model, sp, common, d, s0, s1, busy, start_date, window_start, tariff,
                                         expected_students))

    candidates.sort(key=lambda c: c["score"])
    return {
        "candidates": candidates,
        "rejected_rooms": rejected,
        "days_searched": days_searched,
        "eligible_rooms": [r.code for r in rooms],
    }


def _score(model, sp, common, d, s0, s1, busy, start_date, window_start, tariff, students) -> Dict[str, Any]:
    mid = datetime.combine(d, _from_min((s0 + s1) // 2))
    hours = (s1 - s0) / 60.0
    session_kwh = model.expected_kw(sp, "BOOKED", mid) * hours

    reasons: List[str] = []
    back_to_back_before = any(b1 == s0 for _, b1, _ in busy)
    back_to_back_after = any(b0 == s1 for b0, _, _ in busy)
    if back_to_back_before:
        precool_kwh = 0.0
        reasons.append("Room is already in use right before; no pre-cooling needed")
    else:
        precool_kwh = model.expected_kw(sp, "PRECOOL", datetime.combine(d, _from_min(max(0, s0 - 5)))) * PRECOOL_MIN / 60.0
    if back_to_back_after:
        reasons.append("Runs straight into the next class, so the room isn't cooled twice")

    # Common areas stay lit/ventilated for any part of the class outside floor hours.
    outside = 0
    if d.weekday() >= 5:
        outside = s1 - s0
    else:
        outside = max(0, _t(COMMON_OPEN) - s0) + max(0, s1 - _t(COMMON_CLOSE))
    after_hours_kwh = 0.0
    if outside > 0:
        at = datetime.combine(d, _from_min(min(s1 - 1, max(s0, _t(COMMON_CLOSE)))))
        delta = sum(model.expected_kw(c, "OPEN", at) - model.expected_kw(c, "CLOSED", at) for c in common)
        after_hours_kwh = max(0.0, delta) * outside / 60.0
        reasons.append(f"{outside} min outside floor hours keeps corridor/washroom loads on")

    empty = (sp.capacity or 0) - students
    if empty <= 10:
        reasons.append(f"Tight fit: {sp.capacity} seats for {students} students")
    total_kwh = session_kwh + precool_kwh + after_hours_kwh
    delay_h = (d - start_date).days * 24 + max(0, s0 - _t(window_start)) / 60.0
    score = total_kwh + 0.02 * max(0, empty) + 0.12 * min(delay_h, 48)

    return {
        "classroom_id": sp.classroom_id,
        "room": sp.code,
        "capacity": sp.capacity,
        "date": d.isoformat(),
        "start_time": _from_min(s0).strftime("%H:%M"),
        "end_time": _from_min(s1).strftime("%H:%M"),
        "est_kwh": round(total_kwh, 2),
        "est_cost_inr": round(total_kwh * tariff, 2),
        "breakdown": {
            "session_kwh": round(session_kwh, 2),
            "precool_kwh": round(precool_kwh, 2),
            "after_hours_kwh": round(after_hours_kwh, 2),
        },
        "empty_seats": empty,
        "reasons": reasons,
        "score": round(score, 3),
    }
