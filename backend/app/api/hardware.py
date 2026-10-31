"""Simulated hardware layer API: gateway overview, relay banks, sensors, alarms and switching.

Nothing here talks to real hardware yet; every payload is deterministic and flagged `simulated: true`.
"""
import json
from datetime import datetime, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.telemetry import _parse_at
from app.clock import now_local
from app.database import get_db
from app.models.models import AuditLog, DeviceState, HwAlarmAck, Space
from app.services.hardware_service import (
    CATEGORY_OF,
    CHANNEL_ORDER,
    HwFloor,
    bank_id,
    task_from_audit,
)

router = APIRouter(prefix="/hw", tags=["Hardware layer (simulated)"])

CATEGORY_FLAG = {"HVAC": "ac_on", "LIGHTING": "lights_on", "FAN": "fan_on"}


class SwitchIn(BaseModel):
    state: Literal["OFF", "ON"]
    channels: Optional[List[str]] = None
    force: bool = False
    mode: Optional[Literal["force_on"]] = None  # ON only: force circuits on instead of restoring automatic control
    at: Optional[str] = None  # simulation clock override (ISO); default now


class AckIn(BaseModel):
    key: str


def _floor(db: Session, floor_id: Optional[int], at: Optional[str]) -> HwFloor:
    hw = HwFloor(db, floor_id, _parse_at(at))
    if not hw.floor:
        raise HTTPException(404, "Floor not found")
    return hw


@router.get("/overview")
def overview(floor_id: Optional[int] = None, at: Optional[str] = None, db: Session = Depends(get_db)):
    return _floor(db, floor_id, at).overview()


@router.get("/channels")
def channels(floor_id: Optional[int] = None, at: Optional[str] = None, db: Session = Depends(get_db)):
    hw = _floor(db, floor_id, at)
    return hw.channel_rows()


@router.get("/alarms")
def alarms(floor_id: Optional[int] = None, at: Optional[str] = None, db: Session = Depends(get_db)):
    hw = _floor(db, floor_id, at)
    return hw.alarms()


@router.post("/alarms/ack")
def ack_alarm(payload: AckIn, db: Session = Depends(get_db)):
    key = payload.key.strip()
    if not key or len(key) > 200:
        raise HTTPException(400, "Invalid alarm key")
    ack = db.get(HwAlarmAck, key)
    if not ack:
        ack = HwAlarmAck(key=key, actor="admin", acked_at=datetime.now(timezone.utc))
        db.add(ack)
        db.add(AuditLog(entity_type="HW", entity_id=key, action="ACK", actor="admin",
                        details_json=json.dumps({"key": key})))
        db.commit()
        db.refresh(ack)
    return {"key": ack.key, "acked": True, "acked_by": ack.actor,
            "acked_at": ack.acked_at.replace(tzinfo=None).isoformat(timespec="seconds")}


@router.get("/tasks")
def tasks(limit: int = Query(50, ge=1, le=500), db: Session = Depends(get_db)):
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(limit).all()
    return [task_from_audit(db, r) for r in rows]


@router.get("/spaces/{space_id}")
def space_detail(space_id: int, at: Optional[str] = None, db: Session = Depends(get_db)):
    space = db.get(Space, space_id)
    if not space:
        raise HTTPException(404, f"Space {space_id} not found")
    hw = _floor(db, space.floor_id, at)
    return hw.space_detail(hw.bundle(space_id))


def _set_overrides(db: Session, classroom_id: int, categories: List[str], on: bool) -> None:
    st = db.query(DeviceState).filter(DeviceState.classroom_id == classroom_id).first()
    if not st:
        st = DeviceState(classroom_id=classroom_id, ac_on=True, fan_on=True, lights_on=True)
        db.add(st)
    elif st.source not in ("OVERRIDE", "SIMULATION"):
        # An override applies to all three flags, so start from "everything on" to leave others untouched.
        st.ac_on = st.fan_on = st.lights_on = True
    for cat in categories:
        setattr(st, CATEGORY_FLAG[cat], on)
    st.source = "OVERRIDE"
    st.updated_at = datetime.now(timezone.utc)


def _clear_overrides(db: Session, classroom_id: int, categories: List[str]) -> None:
    """Return the listed categories to automatic control; drop the override entirely once none remain."""
    st = db.query(DeviceState).filter(DeviceState.classroom_id == classroom_id).first()
    if not st:
        return
    for cat in categories:
        setattr(st, CATEGORY_FLAG[cat], True)
    if st.ac_on and st.fan_on and st.lights_on:
        st.source = "TIMETABLE"
    st.updated_at = datetime.now(timezone.utc)


@router.post("/spaces/{space_id}/switch")
def switch(space_id: int, payload: SwitchIn, db: Session = Depends(get_db)):
    space = db.get(Space, space_id)
    if not space:
        raise HTTPException(404, f"Space {space_id} not found")
    chs = None
    if payload.channels:
        chs = [c.upper() for c in payload.channels]
        bad = [c for c in chs if c not in CATEGORY_OF]
        if bad:
            raise HTTPException(400, f"Unknown channel(s) {bad}; valid: {CHANNEL_ORDER}")
        chs = [c for c in CHANNEL_ORDER if c in chs]
    dt = _parse_at(payload.at)
    off = payload.state == "OFF"

    before = HwFloor(db, space.floor_id, dt)
    b = before.bundle(space_id)
    if off and b["interlock"]["active"] and not payload.force:
        raise HTTPException(409, b["interlock"]["reason"])

    target_chs = chs or [c["ch"] for c in b["channels"]]
    cats = [CATEGORY_OF[c] for c in target_chs]
    arm_cut = False
    if off:
        if not chs or not space.classroom_id or "K4" in chs:
            arm_cut = True
        flag_cats = [c for c in cats if c in CATEGORY_FLAG]
        if chs and space.classroom_id and flag_cats:
            _set_overrides(db, space.classroom_id, flag_cats, False)
        if arm_cut:
            space.cut_at = dt.replace(microsecond=0)
    elif payload.mode == "force_on":
        space.cut_at = None
        if space.classroom_id:
            flag_cats = [c for c in (cats if chs else list(CATEGORY_FLAG)) if c in CATEGORY_FLAG]
            if flag_cats:
                _set_overrides(db, space.classroom_id, flag_cats, True)
    else:
        # Restore: hand control back to the schedule rather than forcing anything on.
        if not chs or not space.classroom_id or "K4" in chs:
            space.cut_at = None
        if space.classroom_id:
            flag_cats = [c for c in (cats if chs else list(CATEGORY_FLAG)) if c in CATEGORY_FLAG]
            _clear_overrides(db, space.classroom_id, flag_cats)
    db.flush()

    after = HwFloor(db, space.floor_id, dt).bundle(space_id)
    touched = [c for c in after["channels"] if c["ch"] in target_chs]
    bad = [c["ch"] for c in touched if c["status"] == "MISMATCH"]
    if bad:
        result, status = f"No feedback on {', '.join(bad)}, retrying (1/3)", "WARN"
    elif not touched:
        result, status = "No switchable channels in this space", "WARN"
    else:
        n = len(touched)
        result, status = f"OK · {n} channel{'s' if n != 1 else ''} confirmed", "OK"

    if off:
        task = f"Switch off {', '.join(chs)}" if chs else "Switch off all channels"
    elif payload.mode == "force_on":
        task = f"Force on {', '.join(chs)}" if chs else "Force on all channels"
    else:
        task = f"Restore automatic control {', '.join(chs)}" if chs else "Restore automatic control"
        if status == "OK":
            result = "OK · returned to schedule"
    target = f"{space.code} / {bank_id(space.code)}"
    db.add(AuditLog(
        entity_type="HW", entity_id=str(space.id), action="SWITCH", actor="admin",
        details_json=json.dumps({"space": space.code, "state": payload.state, "channels": chs or target_chs,
                                 "force": payload.force, "target": target, "task": task,
                                 "result": result, "status": status})))
    db.commit()
    row = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    return {"simulated": True, **task_from_audit(db, row)}
