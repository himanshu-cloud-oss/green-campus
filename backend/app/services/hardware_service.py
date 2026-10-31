"""Simulated hardware layer: relay banks, sensors, gateway health and derived alarms.

No hardware exists yet. Everything here is derived deterministically from the telemetry
model (`FloorModel`) plus seeded randomness, so the same instant always returns the same data.
All responses are flagged `simulated: true` by the API layer.
"""
import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.clock import utc_offset
from app.models.models import AuditLog, Classroom, HwAlarmAck, Space
from app.services.telemetry_service import DAY_CODES, WASTE_STATES, FloorModel, _rand

CHANNEL_OF = {"HVAC": "K1", "LIGHTING": "K2", "FAN": "K3", "AV": "K4"}
CATEGORY_OF = {v: k for k, v in CHANNEL_OF.items()}
CHANNEL_ORDER = ["K1", "K2", "K3", "K4"]
PIR_KINDS = ("CLASSROOM", "LAB", "STAFF_ROOM")
CLASS_BLOCKED = "Class in session — trip blocked"
PRECOOL_REASON = "Pre-cooling for next class"
MISMATCH_P = 0.08
STALE_P = 1 / 15
POWERED_KW = 0.05
P2_MIN_WASTE_KW = 0.10


def room_token(code: str) -> str:
    """LS-08 -> 08, COR-2 -> COR2, WR-1 -> WR1."""
    return code[3:] if code.upper().startswith("LS-") else code.replace("-", "")


def bank_id(code: str) -> str:
    return f"RB-{room_token(code)}"


def _clear_text(minutes: int) -> str:
    if minutes < 60:
        return f"Clear {max(minutes, 1)} min"
    return f"Clear {minutes // 60} h {minutes % 60:02d} min"


def fmt_duration(minutes: int) -> str:
    if minutes < 60:
        return f"{minutes} min"
    return f"{minutes // 60} h {minutes % 60:02d} min"


def _hhmm_to_dt(dt: datetime, hhmm: str) -> datetime:
    h, m = hhmm.split(":")
    return dt.replace(hour=int(h), minute=int(m), second=0, microsecond=0)


class HwFloor:
    """Everything the hardware endpoints need for one floor at one instant, computed once."""

    def __init__(self, db: Session, floor_id: Optional[int], dt: datetime):
        self.db = db
        self.dt = dt
        self.model = FloorModel(db, floor_id)
        self.floor = self.model.floor
        self.snap = self.model.snapshot(dt) if self.floor else None
        self.spaces: List[Dict[str, Any]] = []
        if not self.floor:
            return
        plain = {s.id: s for s in self.model.spaces}
        for ss in self.snap["spaces"]:
            self.spaces.append(self._bundle(plain[ss["space_id"]], ss))

    # ------------------------------------------------------------ per space
    def _entries(self, space) -> List[Dict[str, Any]]:
        """Timetable entries and active bookings for the day, as event dicts sorted by start."""
        if not space.classroom_id:
            return []
        day = DAY_CODES[self.dt.date().weekday()]
        out = []
        for e in self.model.timetable.get((space.classroom_id, day), []):
            out.append({"kind": "TIMETABLE", "subject": e.subject, "teacher": e.teacher, "section": e.section,
                        "start": e.start_time, "end": e.end_time})
        for b in self.model.bookings.get((space.classroom_id, self.dt.date()), []):
            out.append({"kind": "BOOKING", "subject": b.subject, "teacher": b.requested_by, "section": None,
                        "start": b.start_time, "end": b.end_time})
        out.sort(key=lambda x: x["start"])
        return out

    @staticmethod
    def _event_out(ev: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not ev:
            return None
        return {"kind": ev["kind"], "subject": ev["subject"], "teacher": ev["teacher"], "section": ev["section"],
                "start": ev["start"].strftime("%H:%M"), "end": ev["end"].strftime("%H:%M")}

    def _bundle(self, space, ss: Dict[str, Any]) -> Dict[str, Any]:
        dt, state = self.dt, ss["state"]
        readings = ss["assets"]
        by_id = {a.id: a for a in space.assets}
        since = self.model.state_since(space, dt, state)
        minutes_in_state = max(0, int((dt - _hhmm_to_dt(dt, since)).total_seconds() // 60))

        # ---- relay channels
        switched: Dict[str, List[Dict[str, Any]]] = {}
        unswitched = []
        for r in readings:
            if r["controllable"] and r["category"] in CHANNEL_OF:
                switched.setdefault(CHANNEL_OF[r["category"]], []).append(r)
            else:
                unswitched.append({"name": r["name"], "category": r["category"], "quantity": r["quantity"],
                                   "kw": r["kw"]})
        channels = []
        for ch in CHANNEL_ORDER:
            rs = switched.get(ch)
            if not rs:
                continue
            cat = CATEGORY_OF[ch]
            cmd_off = (ss["cut_armed"] and state in WASTE_STATES) or self.model._override(space, cat, dt) is False
            command = "OFF" if cmd_off else "ON"
            feedback = command
            if command == "OFF" and _rand("relayfb", space.id, ch, dt.date(), dt.hour) < MISMATCH_P:
                feedback = "ON"
            kw = sum(r["kw"] for r in rs)
            if command == "OFF" and feedback == "ON":
                # Relay did not open: power keeps flowing at the level the room would otherwise draw.
                kw = max(kw, self.model.expected_kw(space, state, dt, {cat}))
            status = "MISMATCH" if command != feedback else ("OK" if command == "ON" else "OFF")
            channels.append({
                "ch": ch, "category": cat,
                "load": " + ".join(f"{r['name']} ×{r['quantity']}" for r in rs),
                "quantity": sum(r["quantity"] for r in rs),
                "rated_kw": round(sum(by_id[r["asset_id"]].rated_power_w * r["quantity"] for r in rs) / 1000.0, 3),
                "command": command, "feedback": feedback, "measured_kw": round(kw, 3), "status": status,
            })

        # ---- sensors
        tok = room_token(space.code)
        sensors = []
        if space.kind in PIR_KINDS:
            sid = f"PIR-{tok}"
            present = ss["headcount"] > 0
            sensors.append(self._sensor(
                sid, "OCCUPANCY", "Presence" if present else _clear_text(minutes_in_state),
                battery=12 + round(88 * _rand("batt", sid)), amps=None))
        sensors.append(self._sensor(f"CT-{tok}", "POWER", f"{ss['kw']:.2f} kW", battery=None,
                                    amps=round(ss["kw"] * 1000.0 / 230.0, 1)))

        interlock = {"active": False, "reason": None}
        if state in ("OCCUPIED", "BOOKED"):
            interlock = {"active": True, "reason": CLASS_BLOCKED}
        elif state == "PRECOOL":
            interlock = {"active": True, "reason": PRECOOL_REASON}

        entries = self._entries(space)
        t = dt.time()
        now_ev = next((e for e in entries if e["start"] <= t < e["end"]), None)
        next_ev = next((e for e in entries if e["start"] > t), None)

        pir = next((s for s in sensors if s["type"] == "OCCUPANCY"), None)
        return {
            "space": space, "ss": ss, "state_since": since, "minutes_in_state": minutes_in_state,
            "channels": channels, "unswitched": unswitched, "sensors": sensors, "interlock": interlock,
            "timetable_now": self._event_out(now_ev), "next_event": self._event_out(next_ev),
            "occupancy_text": pir["reading"] if pir else (ss["label"] or "-"),
            "sensor_last_seen_s": (pir or sensors[-1])["last_seen_s"],
            "sensor_stale": any(s["status"] == "STALE" for s in sensors),
        }

    def _sensor(self, sid: str, typ: str, reading: str, battery: Optional[int], amps: Optional[float]) -> Dict[str, Any]:
        dt = self.dt
        if _rand("stale", sid, dt.date(), dt.hour) < STALE_P:
            seen, status = 300 + int(600 * _rand("stale_s", sid, dt.date(), dt.hour)), "STALE"
        else:
            seen = 1 + int(6 * _rand("seen", sid, dt.replace(microsecond=0)))
            status = "LOW_BATTERY" if battery is not None and battery < 20 else "ONLINE"
        return {"id": sid, "type": typ, "reading": reading, "battery_pct": battery, "amps": amps,
                "last_seen_s": min(seen, 6) if status != "STALE" else seen, "status": status}

    # ------------------------------------------------------------ views
    def bundle(self, space_id: int) -> Optional[Dict[str, Any]]:
        return next((b for b in self.spaces if b["space"].id == space_id), None)

    def space_detail(self, b: Dict[str, Any]) -> Dict[str, Any]:
        sp, ss = b["space"], b["ss"]
        return {
            "simulated": True, "at": self.dt.isoformat(timespec="seconds"),
            "space": {"id": sp.id, "code": sp.code, "name": sp.name, "kind": sp.kind, "capacity": sp.capacity},
            "state": ss["state"], "label": ss["label"], "state_since": b["state_since"],
            "kw": ss["kw"], "waste_kw": ss["waste_kw"], "cut_armed": ss["cut_armed"],
            "timetable_now": b["timetable_now"], "next_event": b["next_event"],
            "relay_bank": {"id": bank_id(sp.code), "channels": b["channels"]},
            "unswitched": b["unswitched"], "sensors": b["sensors"], "interlock": b["interlock"],
        }

    @staticmethod
    def rule(b: Dict[str, Any]) -> str:
        state, kind = b["ss"]["state"], b["space"].kind
        if state == "LUNCH":
            return "Lunch eco"
        if state == "AFTER_HOURS":
            return "After hours"
        if kind == "STAFF_ROOM":
            return "Staff hours"
        if state in ("OPEN", "CLOSED"):
            return "Floor hours"
        return "Timetable"

    def channel_rows(self) -> List[Dict[str, Any]]:
        rows = []
        for b in self.spaces:
            sp, ss = b["space"], b["ss"]
            waste_state = ss["state"] in WASTE_STATES
            for c in b["channels"]:
                if c["status"] == "MISMATCH":
                    health = "MISMATCH"
                elif waste_state and c["measured_kw"] > POWERED_KW:
                    health = "WASTE"
                elif b["sensor_stale"]:
                    health = "STALE"
                else:
                    health = "OK"
                rows.append({
                    "space_id": sp.id, "room": sp.code, "kind": sp.kind, "ch": c["ch"], "category": c["category"],
                    "load": c["load"], "command": c["command"], "feedback": c["feedback"], "kw": c["measured_kw"],
                    "occupancy": b["occupancy_text"], "sensor_last_seen_s": b["sensor_last_seen_s"],
                    "rule": self.rule(b), "health": health,
                })
        return rows

    # ------------------------------------------------------------ alarms
    def alarms(self) -> List[Dict[str, Any]]:
        dt = self.dt
        day = dt.date().isoformat()
        hour_start = dt.replace(minute=0, second=0, microsecond=0)
        raw: List[Dict[str, Any]] = []
        for b in self.spaces:
            sp, ss = b["space"], b["ss"]
            for c in b["channels"]:
                if c["status"] == "MISMATCH":
                    raw.append({
                        "key": f"mismatch:{sp.code}:{c['ch']}:{day}", "priority": "P1", "start": hour_start,
                        "object": f"{sp.code} / {c['ch']}", "space_id": sp.id,
                        "message": f"Relay {c['ch']} ({c['category']}) did not confirm OFF; still drawing "
                                   f"{c['measured_kw']:.2f} kW"})
            if (ss["state"] in WASTE_STATES and ss["waste_kw"] >= P2_MIN_WASTE_KW
                    and b["minutes_in_state"] > 15):
                raw.append({
                    "key": f"unocc:{sp.code}:{day}", "priority": "P2",
                    "start": _hhmm_to_dt(dt, b["state_since"]), "object": sp.code, "space_id": sp.id,
                    "message": f"Unoccupied for {fmt_duration(b['minutes_in_state'])} and powered "
                               f"({ss['waste_kw']:.2f} kW switchable load running)"})
            for s in b["sensors"]:
                if s["status"] == "STALE":
                    raw.append({"key": f"sensor:{s['id']}:stale:{day}:{dt.hour:02d}", "priority": "P3",
                                "start": hour_start, "object": s["id"], "space_id": sp.id,
                                "message": f"No data from {s['id']} for {s['last_seen_s'] // 60} min"})
                elif s["status"] == "LOW_BATTERY":
                    raw.append({"key": f"sensor:{s['id']}:battery:{day}", "priority": "P3",
                                "start": dt.replace(hour=0, minute=0, second=0, microsecond=0),
                                "object": s["id"], "space_id": sp.id,
                                "message": f"{s['id']} battery low ({s['battery_pct']}%)"})
        acks = {}
        if raw:
            acks = {a.key: a for a in self.db.query(HwAlarmAck).filter(HwAlarmAck.key.in_([r["key"] for r in raw])).all()}
        off = utc_offset()
        out = []
        for r in sorted(raw, key=lambda r: (r["start"], r["priority"]), reverse=True):
            a = acks.get(r["key"])
            out.append({
                "key": r["key"], "priority": r["priority"], "time": r["start"].strftime("%H:%M"),
                "object": r["object"], "space_id": r["space_id"], "message": r["message"],
                "acked": a is not None,
                "acked_at": (a.acked_at.replace(tzinfo=None) + off).isoformat(timespec="seconds") if a else None,
                "acked_by": a.actor if a else None,
            })
        return out

    def overview(self) -> Dict[str, Any]:
        f = self.floor
        channels = [c for b in self.spaces for c in b["channels"]]
        sensors = [s for b in self.spaces for s in b["sensors"]]
        cts = [s for s in sensors if s["type"] == "POWER"]
        alarms = self.alarms()
        mism = sum(1 for c in channels if c["status"] == "MISMATCH")
        return {
            "simulated": True, "at": self.dt.isoformat(timespec="seconds"),
            "floor": {"id": f.id, "name": f.name, "building": f.building.name if f.building else None},
            "gateway": {"id": f"GW-L{f.level}", "status": "ONLINE",
                        "last_seen_s": 1 + int(5 * _rand("gw", f.id, self.dt.replace(microsecond=0)))},
            "load_kw": self.snap["total_kw"], "waste_kw": self.snap["waste_kw"],
            "unoccupied_powered_rooms": sum(
                1 for b in self.spaces if b["ss"]["state"] in WASTE_STATES and b["ss"]["waste_kw"] >= P2_MIN_WASTE_KW),
            "sensors": {"online": sum(1 for s in sensors if s["status"] != "STALE"), "total": len(sensors)},
            "relays": {"ok": len(channels) - mism, "total": len(channels), "mismatch": mism},
            "meters": {"ok": sum(1 for s in cts if s["status"] != "STALE"), "total": len(cts),
                       "stale": sum(1 for s in cts if s["status"] == "STALE")},
            "alarms": {"open": len(alarms), "unacked": sum(1 for a in alarms if not a["acked"]),
                       "p1": sum(1 for a in alarms if a["priority"] == "P1"),
                       "p2": sum(1 for a in alarms if a["priority"] == "P2"),
                       "p3": sum(1 for a in alarms if a["priority"] == "P3")},
        }


# ----------------------------------------------------------------------------- tasks (audit log view)
def _loads(s: Optional[str]) -> Dict[str, Any]:
    try:
        d = json.loads(s) if s else {}
        return d if isinstance(d, dict) else {}
    except ValueError:
        return {}


def task_from_audit(db: Session, row: AuditLog) -> Dict[str, Any]:
    d = _loads(row.details_json)
    et, act = row.entity_type, row.action
    target, result, status = f"{et.title()} {row.entity_id or ''}".strip(), "OK", "OK"
    if et == "HW" and act == "SWITCH":
        task = d.get("task") or f"Switch {str(d.get('state', '')).lower()}"
        target = d.get("target") or d.get("space") or target
        result, status = d.get("result", "OK"), d.get("status", "OK")
    elif et == "HW" and act == "ACK":
        task, target = "Acknowledge alarm", d.get("key", target)
    elif et == "SPACE" and act in ("CUT", "RELEASE"):
        code = d.get("space")
        if not code and row.entity_id and row.entity_id.isdigit():
            sp = db.get(Space, int(row.entity_id))
            code = sp.code if sp else None
        target = f"{code} / {bank_id(code)}" if code else target
        task = "Cut all channels (armed for the day)" if act == "CUT" else "Release cut"
    elif et == "DEVICE_STATE":
        if row.entity_id and row.entity_id.isdigit():
            c = db.get(Classroom, int(row.entity_id))
            target = c.name if c else target
        parts = [f"{lbl} {'on' if d[k] else 'off'}" for k, lbl in
                 (("ac_on", "AC"), ("fan_on", "fans"), ("lights_on", "lights")) if d.get(k) is not None]
        task = "Override " + ", ".join(parts) if parts else "Override device state"
    elif et == "BOOKING":
        target = f"Booking #{row.entity_id}" if row.entity_id else "Booking"
        task = f"Booking {act.lower()}"
    elif et == "ASSET":
        target, task = f"Asset #{row.entity_id}", f"Asset {act.lower()}"
    elif et == "SETTING":
        target, task = d.get("key") or f"Setting {row.entity_id}", f"Setting {act.lower()}"
    else:
        task = f"{et.title()} {act.lower()}"
    t = row.created_at.replace(tzinfo=None) + utc_offset() if row.created_at else None
    return {"time": t.isoformat(timespec="seconds") if t else None, "target": target, "task": task,
            "user": row.actor, "result": result, "status": status}
