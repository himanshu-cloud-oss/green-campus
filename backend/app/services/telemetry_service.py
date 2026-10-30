"""Simulated floor telemetry.

There is no metering hardware yet, so live power is *modelled* from:
  - the device inventory (what is installed and its rated power),
  - the timetable and extra-class bookings (who should be in each room),
  - Faridabad's seasonal/diurnal temperature (whether AC and fans are needed),
  - human behaviour (lights/fans/AC left on in empty rooms, classes that don't happen),
  - admin overrides on the room switches.

Randomness is seeded from (device, time slot), so the same moment always
produces the same reading and refreshing the page doesn't reshuffle history.
Every response is flagged `simulated: true`.
"""
import hashlib
import math
from collections import defaultdict
from datetime import date, datetime, time, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session, joinedload

from app.models.models import (
    Asset,
    DeviceState,
    ExtraClassBooking,
    Floor,
    Space,
    TimetableEntry,
)
from app.services.inventory_service import CATEGORIES, CATEGORY_SWITCH, device_duty

DAY_CODES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
DAY_START, DAY_END = time(8, 10), time(16, 30)
LUNCH_START, LUNCH_END = time(11, 30), time(12, 20)
COMMON_OPEN, COMMON_CLOSE = time(7, 45), time(17, 45)
STAFF_IN, STAFF_OUT = time(8, 0), time(17, 15)
PRECOOL_MIN = 10

# Model assumptions (exposed via API so the UI can show them).
ASSUMPTIONS = {
    "no_show_rate": 0.07,          # share of scheduled periods where the class doesn't happen
    "behaviour_slot_minutes": 15,  # people flip switches at most this often
    "ac_threshold_c": 26.0,        # outdoor temp above which occupied rooms run AC
    "fan_threshold_c": 21.0,
}

# Probability a single unit is on, by category and room state (baseline: no automation).
P_ON = {
    "OCCUPIED":    {"LIGHTING": 0.92, "FAN": 0.95, "HVAC": 0.95, "AV": 0.75, "IT": 0.8, "APPLIANCE": 1.0, "OTHER": 0.6},
    "BOOKED":      {"LIGHTING": 0.92, "FAN": 0.95, "HVAC": 0.95, "AV": 0.8,  "IT": 0.8, "APPLIANCE": 1.0, "OTHER": 0.6},
    "PRECOOL":     {"LIGHTING": 0.30, "FAN": 0.30, "HVAC": 0.60, "AV": 0.05, "IT": 0.1, "APPLIANCE": 1.0, "OTHER": 0.1},
    "VACANT":      {"LIGHTING": 0.35, "FAN": 0.30, "HVAC": 0.25, "AV": 0.08, "IT": 0.1, "APPLIANCE": 1.0, "OTHER": 0.1},
    "NO_SHOW":     {"LIGHTING": 0.55, "FAN": 0.45, "HVAC": 0.40, "AV": 0.05, "IT": 0.1, "APPLIANCE": 1.0, "OTHER": 0.1},
    "LUNCH":       {"LIGHTING": 0.40, "FAN": 0.35, "HVAC": 0.30, "AV": 0.10, "IT": 0.3, "APPLIANCE": 1.0, "OTHER": 0.1},
    "AFTER_HOURS": {"LIGHTING": 0.06, "FAN": 0.04, "HVAC": 0.03, "AV": 0.02, "IT": 0.05, "APPLIANCE": 1.0, "OTHER": 0.02},
    "OPEN":        {"LIGHTING": 1.00, "FAN": 0.80, "HVAC": 0.90, "AV": 0.30, "IT": 1.0, "APPLIANCE": 1.0, "OTHER": 0.5},
    "CLOSED":      {"LIGHTING": 0.15, "FAN": 0.10, "HVAC": 0.02, "AV": 0.02, "IT": 1.0, "APPLIANCE": 1.0, "OTHER": 0.05},
}
WASTE_STATES = {"VACANT", "NO_SHOW", "LUNCH", "AFTER_HOURS", "CLOSED"}
ALWAYS_ON_TYPES = {"WIFI_AP", "CCTV_CAMERA", "WATER_COOLER"}

# Faridabad monthly mean temperature (deg C), Jan..Dec, and daily half-swing.
MONTH_MEAN_C = [14.5, 17.5, 23.0, 29.0, 33.0, 33.5, 31.0, 30.0, 29.0, 25.5, 20.0, 15.5]
MONTH_SWING_C = [6.5, 6.5, 7.0, 7.5, 7.0, 5.5, 3.5, 3.0, 4.0, 6.5, 7.0, 6.5]


def _rand(*keys: Any) -> float:
    """Deterministic uniform [0, 1) from arbitrary keys."""
    h = hashlib.blake2b("|".join(map(str, keys)).encode(), digest_size=8).digest()
    return int.from_bytes(h, "big") / 2**64


def _rands(n: int, *keys: Any) -> List[float]:
    """n deterministic uniforms from one hash (cheaper than n calls to _rand)."""
    out: List[float] = []
    block = 0
    while len(out) < n:
        h = hashlib.blake2b("|".join(map(str, (*keys, block))).encode(), digest_size=64).digest()
        out.extend(int.from_bytes(h[i:i + 2], "big") / 65536.0 for i in range(0, 64, 2))
        block += 1
    return out[:n]


def outdoor_temp_c(dt: datetime) -> float:
    m = dt.month - 1
    hour = dt.hour + dt.minute / 60.0
    diurnal = math.cos((hour - 15.0) / 24.0 * 2 * math.pi)  # peak ~15:00, trough ~03:00
    day_offset = (_rand("tempday", dt.date()) - 0.5) * 4.0  # weather varies day to day
    return round(MONTH_MEAN_C[m] + MONTH_SWING_C[m] * diurnal + day_offset, 1)


def _in(t: time, start: time, end: time) -> bool:
    return start <= t < end


def _minutes_until(t: time, target: time) -> float:
    return (target.hour * 60 + target.minute) - (t.hour * 60 + t.minute + t.second / 60)


class FloorModel:
    """Loads a floor's inventory, timetable and bookings once, then evaluates any instant."""

    def __init__(self, db: Session, floor_id: Optional[int] = None):
        q = db.query(Floor).options(joinedload(Floor.spaces).joinedload(Space.assets))
        floor = q.filter(Floor.id == floor_id).first() if floor_id else (
            q.filter(Floor.is_pilot.is_(True)).first() or q.first()
        )
        self.floor = floor
        self.spaces = [_Plain(s, assets=[_Plain(a) for a in s.assets]) for s in floor.spaces] if floor else []
        self._local_offset = datetime.now().astimezone().utcoffset() or timedelta(0)
        classroom_ids = [s.classroom_id for s in self.spaces if s.classroom_id]

        self.timetable: Dict[Tuple[int, str], List[TimetableEntry]] = defaultdict(list)
        self.bookings: Dict[Tuple[int, date], List[ExtraClassBooking]] = defaultdict(list)
        self.overrides: Dict[int, DeviceState] = {}
        if classroom_ids:
            for e in db.query(TimetableEntry).filter(TimetableEntry.classroom_id.in_(classroom_ids)).all():
                self.timetable[(e.classroom_id, e.day_of_week)].append(e)
            for b in db.query(ExtraClassBooking).filter(
                ExtraClassBooking.classroom_id.in_(classroom_ids), ExtraClassBooking.status == "ACTIVE"
            ).all():
                self.bookings[(b.classroom_id, b.date)].append(b)
            for d in db.query(DeviceState).filter(DeviceState.classroom_id.in_(classroom_ids)).all():
                self.overrides[d.classroom_id] = d

    # ------------------------------------------------------------------ occupancy
    def occupancy(self, space: Space, dt: datetime) -> Dict[str, Any]:
        t, d = dt.time(), dt.date()
        day = DAY_CODES[d.weekday()]
        info: Dict[str, Any] = {"state": "AFTER_HOURS", "label": None, "headcount": 0}

        if space.kind in ("CLASSROOM", "LAB") and space.classroom_id:
            cid = space.classroom_id
            booking = next((b for b in self.bookings.get((cid, d), []) if _in(t, b.start_time, b.end_time)), None)
            if booking:
                att = 0.75 + 0.2 * _rand("att", "b", booking.id)
                return {"state": "BOOKED", "label": booking.subject, "headcount": int(booking.expected_students * att),
                        "booking_id": booking.id}
            entries = self.timetable.get((cid, day), [])
            entry = next((e for e in entries if _in(t, e.start_time, e.end_time)), None)
            if entry:
                if _rand("noshow", cid, d, entry.period_number) < ASSUMPTIONS["no_show_rate"]:
                    return {"state": "NO_SHOW", "label": f"{entry.subject} (not held)", "headcount": 0,
                            "teacher": entry.teacher}
                cap = space.capacity or 60
                att = 0.6 + 0.35 * _rand("att", cid, d, entry.period_number)
                return {"state": "OCCUPIED", "label": entry.subject, "teacher": entry.teacher,
                        "section": entry.section, "headcount": int(cap * att)}
            upcoming = [e for e in entries if 0 < _minutes_until(t, e.start_time) <= PRECOOL_MIN] + \
                       [b for b in self.bookings.get((cid, d), []) if 0 < _minutes_until(t, b.start_time) <= PRECOOL_MIN]
            if upcoming:
                return {"state": "PRECOOL", "label": f"Next: {upcoming[0].subject}", "headcount": 0}
            if _in(t, LUNCH_START, LUNCH_END) and d.weekday() < 5:
                return {"state": "LUNCH", "label": "Lunch break", "headcount": 0}
            if _in(t, DAY_START, DAY_END) and d.weekday() < 5:
                return {"state": "VACANT", "label": "Free period", "headcount": 0}
            return info

        if space.kind == "STAFF_ROOM":
            if d.weekday() < 5 and _in(t, STAFF_IN, STAFF_OUT):
                return {"state": "OCCUPIED", "label": "Staff present",
                        "headcount": 4 + int(6 * _rand("staff", d, dt.hour))}
            if d.weekday() == 5 and _in(t, time(9, 0), time(13, 0)):
                return {"state": "OCCUPIED", "label": "Saturday half day", "headcount": 2}
            return info

        # Corridors, washrooms, lobbies: open while the floor is in use.
        if (d.weekday() < 5 and _in(t, COMMON_OPEN, COMMON_CLOSE)) or self._any_booking_now(dt):
            return {"state": "OPEN", "label": "Floor open", "headcount": 0}
        return {"state": "CLOSED", "label": "Floor closed", "headcount": 0}

    def state_since(self, space: Any, dt: datetime, state: str) -> str:
        """When the space entered its current state (HH:MM), searched back in 5-minute steps."""
        t = dt.replace(second=0, microsecond=0)
        t -= timedelta(minutes=t.minute % 5)
        for _ in range(16 * 12):
            prev = t - timedelta(minutes=5)
            if prev.date() != dt.date() or self.occupancy(space, prev)["state"] != state:
                break
            t = prev
        return t.strftime("%H:%M")

    def _any_booking_now(self, dt: datetime) -> bool:
        t, d = dt.time(), dt.date()
        return any(
            _in(t, b.start_time, b.end_time)
            for (cid, bd), items in self.bookings.items() if bd == d for b in items
        )

    # ------------------------------------------------------------------ devices
    def _override(self, space: Space, category: str, dt: datetime) -> Optional[bool]:
        """Admin/automation overrides on the room switch apply for the rest of that day."""
        if not space.classroom_id or category not in CATEGORY_SWITCH:
            return None
        st = self.overrides.get(space.classroom_id)
        if not st or st.source not in ("OVERRIDE", "SIMULATION") or not st.updated_at:
            return None
        # updated_at is stored as naive UTC; compare in local time.
        set_at = st.updated_at.replace(tzinfo=None) + self._local_offset
        if set_at.date() != dt.date() or set_at > dt:
            return None
        return bool(getattr(st, CATEGORY_SWITCH[category]))

    @staticmethod
    def p_on(asset: Any, state: str, temp_c: float) -> float:
        """Probability one unit of this asset is on, given room state and weather."""
        cat = asset.category
        p = P_ON.get(state, P_ON["AFTER_HOURS"]).get(cat, 0.1)
        if cat == "HVAC":
            if temp_c < ASSUMPTIONS["ac_threshold_c"] - 2:
                p = 0.0
            elif temp_c < ASSUMPTIONS["ac_threshold_c"]:
                p *= 0.35
        elif cat == "FAN" and asset.device_type != "EXHAUST_FAN":
            if temp_c < ASSUMPTIONS["fan_threshold_c"] - 3:
                p *= 0.05
            elif temp_c < ASSUMPTIONS["fan_threshold_c"]:
                p *= 0.4
        if asset.device_type in ALWAYS_ON_TYPES:
            p = 1.0
        return p

    @staticmethod
    def duty(asset: Any, temp_c: float) -> float:
        if asset.category == "HVAC":
            return min(1.0, 0.45 + 0.04 * max(0.0, temp_c - 24.0))
        if asset.device_type == "WATER_COOLER":
            return 0.15 + 0.012 * max(0.0, temp_c - 15.0)
        return device_duty(asset.device_type)

    def expected_kw(self, space: Any, state: str, dt: datetime, categories: Optional[set] = None) -> float:
        """Average (not sampled) draw of a space in a given state - used for planning."""
        temp = outdoor_temp_c(dt)
        total = 0.0
        for a in space.assets:
            if categories and a.category not in categories:
                continue
            p = self.p_on(a, state, temp)
            total += a.quantity * (p * a.rated_power_w * self.duty(a, temp) + (1 - p) * a.standby_power_w)
        return total / 1000.0

    def asset_reading(self, asset: Asset, space: Space, state: str, dt: datetime, temp_c: float) -> Dict[str, Any]:
        slot = dt.replace(minute=dt.minute - dt.minute % ASSUMPTIONS["behaviour_slot_minutes"], second=0, microsecond=0)
        cat = asset.category
        p = self.p_on(asset, state, temp_c)

        forced = self._override(space, cat, dt)
        cut_at = getattr(space, "cut_at", None)
        if (cut_at and asset.controllable and state in WASTE_STATES
                and cut_at.date() == dt.date() and cut_at <= dt):
            forced = False
        if forced is not None:
            on = asset.quantity if forced else 0
        elif p <= 0.0:
            on = 0
        elif p >= 1.0:
            on = asset.quantity
        else:
            on = sum(1 for r in _rands(asset.quantity, asset.id, slot) if r < p)

        duty = self.duty(asset, temp_c)
        if cat == "HVAC":
            # Compressor works harder when it's hotter; minute-level jitter for a live feel.
            duty *= 0.92 + 0.16 * _rand("j", asset.id, dt.replace(second=0, microsecond=0))

        watts = on * asset.rated_power_w * duty + (asset.quantity - on) * asset.standby_power_w
        return {"asset_id": asset.id, "name": asset.name, "device_type": asset.device_type, "category": cat,
                "quantity": asset.quantity, "on_count": on, "kw": round(watts / 1000.0, 3),
                "controllable": asset.controllable}

    # ------------------------------------------------------------------ snapshots
    def snapshot(self, dt: datetime, detail: bool = True) -> Dict[str, Any]:
        temp = outdoor_temp_c(dt)
        by_cat = {c: 0.0 for c in CATEGORIES}
        total = waste = 0.0
        on_units = all_units = 0
        spaces_out = []
        for space in self.spaces:
            occ = self.occupancy(space, dt)
            readings = [self.asset_reading(a, space, occ["state"], dt, temp) for a in space.assets]
            kw = sum(r["kw"] for r in readings)
            w = 0.0
            if occ["state"] in WASTE_STATES:
                w = sum(r["kw"] for r in readings if r["controllable"] and r["on_count"] > 0)
            for r in readings:
                by_cat[r["category"]] = by_cat.get(r["category"], 0.0) + r["kw"]
                on_units += r["on_count"]
                all_units += r["quantity"]
            total += kw
            waste += w
            if detail:
                spaces_out.append({
                    "space_id": space.id, "code": space.code, "name": space.name, "kind": space.kind,
                    "capacity": space.capacity, "classroom_id": space.classroom_id, **occ,
                    "kw": round(kw, 3), "waste_kw": round(w, 3),
                    "waste_reason": _waste_reason(occ["state"], readings) if w > 0 else None,
                    "state_since": self.state_since(space, dt, occ["state"]) if w > 0 else None,
                    "cut_armed": bool(space.cut_at and space.cut_at.date() == dt.date() and space.cut_at <= dt),
                    "assets": readings,
                })
        out = {
            "timestamp": dt.isoformat(timespec="seconds"),
            "simulated": True,
            "outdoor_temp_c": temp,
            "total_kw": round(total, 3),
            "waste_kw": round(waste, 3),
            "by_category": {k: round(v, 3) for k, v in by_cat.items()},
            "units_on": on_units,
            "units_total": all_units,
        }
        if detail:
            out["floor"] = {"id": self.floor.id, "name": self.floor.name,
                            "building": self.floor.building.name} if self.floor else None
            out["spaces"] = spaces_out
        return out

    def series(self, start: datetime, end: datetime, step_min: int) -> List[Dict[str, Any]]:
        pts, t = [], start
        while t <= end:
            s = self.snapshot(t, detail=False)
            pts.append({"t": s["timestamp"], "kw": s["total_kw"], "waste_kw": s["waste_kw"],
                        "temp_c": s["outdoor_temp_c"], **{f"cat_{k}": v for k, v in s["by_category"].items()}})
            t += timedelta(minutes=step_min)
        return pts

    def day_energy(self, d: date, step_min: int = 30) -> Dict[str, float]:
        """Integrate one day's modelled power into kWh."""
        key = (self.floor.id if self.floor else 0, d, step_min, _fingerprint(self))
        if key in _DAY_CACHE:
            return _DAY_CACHE[key]
        kwh = waste = 0.0
        cats = defaultdict(float)
        h = step_min / 60.0
        t = datetime.combine(d, time(0, 0)) + timedelta(minutes=step_min / 2)
        while t.date() == d:
            s = self.snapshot(t, detail=False)
            kwh += s["total_kw"] * h
            waste += s["waste_kw"] * h
            for c, v in s["by_category"].items():
                cats[c] += v * h
            t += timedelta(minutes=step_min)
        res = {"date": d.isoformat(), "kwh": round(kwh, 2), "waste_kwh": round(waste, 2),
               **{f"cat_{k}": round(v, 2) for k, v in cats.items()}}
        if d < date.today():
            _DAY_CACHE[key] = res
        return res


_DAY_CACHE: Dict[Any, Dict[str, float]] = {}


class _Plain:
    """Copy of an ORM row's column values as plain attributes (fast to read, detached from the session)."""

    def __init__(self, row: Any, **extra: Any):
        for col in row.__table__.columns:
            setattr(self, col.name, getattr(row, col.name))
        for k, v in extra.items():
            setattr(self, k, v)


def warm_cache(days: int = 35) -> None:
    """Pre-compute recent days so the first dashboard load is fast. Run in a background thread."""
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        model = FloorModel(db)
        if not model.floor:
            return
        today = date.today()
        for i in range(1, days + 1):
            model.day_energy(today - timedelta(days=i))
    finally:
        db.close()


def _fingerprint(model: FloorModel) -> int:
    """Changes whenever inventory or schedules change, so cached days are recomputed."""
    parts = []
    for s in model.spaces:
        parts.append((s.id, s.kind, s.capacity, s.classroom_id, s.cut_at))
        parts.extend((a.id, a.quantity, a.rated_power_w, a.standby_power_w, a.category) for a in s.assets)
    parts.append(sum(len(v) for v in model.timetable.values()))
    parts.append(sum(len(v) for v in model.bookings.values()))
    return hash(tuple(parts))


def _waste_reason(state: str, readings: List[Dict[str, Any]]) -> str:
    on = [f"{r['on_count']}x {r['name']}" for r in readings if r["controllable"] and r["on_count"] > 0]
    where = {"VACANT": "free period", "NO_SHOW": "scheduled class not held", "LUNCH": "lunch break",
             "AFTER_HOURS": "after hours", "CLOSED": "floor closed"}.get(state, state.lower())
    return f"{', '.join(on[:3])} running during {where}"
