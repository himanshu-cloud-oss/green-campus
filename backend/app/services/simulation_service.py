"""Simulation management for classroom no-show automation, countdown timers, and overrides."""
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.models import (
    SimulationEvent,
    DeviceState,
    Classroom,
    Alert,
    AuditLog,
    Setting,
)
from app.config import settings


def get_setting_int(db: Session, key: str, default: int) -> int:
    """Retrieve integer value from settings table with fallback."""
    s = db.query(Setting).filter(Setting.key == key).first()
    if s:
        try:
            return int(s.value)
        except ValueError:
            pass
    return default


def check_override_protection(
    classroom_id: int, slot_start: str, slot_end: str, db: Session
) -> bool:
    """
    Check if a teacher or facility administrator has placed a manual override
    on this classroom within the last 30 minutes.
    """
    state = db.query(DeviceState).filter(DeviceState.classroom_id == classroom_id).first()
    if state and state.source == "OVERRIDE":
        now = datetime.now(timezone.utc)
        updated_at = state.updated_at
        if updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=timezone.utc)
        diff = now - updated_at
        if diff.total_seconds() < 1800:
            return True
    return False


def create_no_show_simulation(
    classroom_id: int,
    period_label: str,
    slot_start: str,
    slot_end: str,
    db: Session,
    notes: Optional[str] = None,
) -> SimulationEvent:
    """
    Initialize a no-show detection simulation event with countdown timer.
    Generates warning alert and records audit log.
    """
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise ValueError(f"Classroom with ID {classroom_id} does not exist")

    countdown_seconds = get_setting_int(
        db, "no_show_countdown_seconds", settings.NO_SHOW_COUNTDOWN_SECONDS
    )
    now = datetime.now(timezone.utc)
    scheduled_action = now + timedelta(seconds=countdown_seconds)

    event = SimulationEvent(
        classroom_id=classroom_id,
        event_type="NO_SHOW",
        triggered_at=now,
        scheduled_action_at=scheduled_action,
        status="PENDING",
        period_label=period_label,
        notes=notes or f"Simulation triggered for {period_label} ({slot_start}-{slot_end})",
    )
    db.add(event)
    db.flush()

    # Generate Alert
    alert = Alert(
        classroom_id=classroom_id,
        severity="WARNING",
        title=f"No-Show Suspected: Classroom {classroom.name}",
        message=(
            f"Classroom {classroom.name} is empty during {period_label} "
            f"({slot_start}-{slot_end}). Automated shutdown scheduled in {countdown_seconds}s."
        ),
        created_at=now,
        alert_type="NO_SHOW_DETECTED",
    )
    db.add(alert)

    # Generate Audit Log
    audit = AuditLog(
        entity_type="SIMULATION",
        entity_id=str(event.id),
        action="CREATE",
        actor="simulation_engine",
        details_json=json.dumps({
            "classroom_id": classroom_id,
            "period": period_label,
            "slot": f"{slot_start}-{slot_end}",
            "countdown_seconds": countdown_seconds,
        }),
        created_at=now,
    )
    db.add(audit)
    db.commit()
    db.refresh(event)
    return event


def execute_simulation_early(simulation_id: int, db: Session) -> SimulationEvent:
    """Manually force execution of a pending simulation before the countdown finishes."""
    event = db.query(SimulationEvent).filter(SimulationEvent.id == simulation_id).first()
    if not event:
        raise ValueError(f"Simulation {simulation_id} not found")
    if event.status != "PENDING":
        return event

    now = datetime.now(timezone.utc)
    classroom = db.query(Classroom).filter(Classroom.id == event.classroom_id).first()
    room_name = classroom.name if classroom else f"Room {event.classroom_id}"

    # Power down devices
    device_state = db.query(DeviceState).filter(DeviceState.classroom_id == event.classroom_id).first()
    if not device_state:
        device_state = DeviceState(classroom_id=event.classroom_id)
        db.add(device_state)
    device_state.ac_on = False
    device_state.fan_on = False
    device_state.lights_on = False
    device_state.source = "SIMULATION"
    device_state.updated_at = now

    event.status = "EXECUTED"

    alert = Alert(
        classroom_id=event.classroom_id,
        severity="INFO",
        title=f"Automated Power Shutdown: Classroom {room_name}",
        message=f"Electrical devices in {room_name} powered down due to verified no-show in {event.period_label}.",
        created_at=now,
        alert_type="AUTO_OFF",
    )
    db.add(alert)

    audit = AuditLog(
        entity_type="SIMULATION",
        entity_id=str(event.id),
        action="EXECUTE",
        actor="operator",
        details_json=json.dumps({"reason": "Manual immediate trigger", "classroom_id": event.classroom_id}),
        created_at=now,
    )
    db.add(audit)
    db.commit()
    db.refresh(event)
    return event


def cancel_simulation(
    simulation_id: int, db: Session, reason: str = "Teacher arrived"
) -> SimulationEvent:
    """Cancel a pending simulation, resolving any pending warning alerts."""
    event = db.query(SimulationEvent).filter(SimulationEvent.id == simulation_id).first()
    if not event:
        raise ValueError(f"Simulation {simulation_id} not found")
    if event.status != "PENDING":
        return event

    now = datetime.now(timezone.utc)
    event.status = "CANCELLED"
    event.notes = f"{event.notes or ''} [Cancelled: {reason}]".strip()

    # Mark pending warning alert as resolved
    pending_alerts = (
        db.query(Alert)
        .filter(
            Alert.classroom_id == event.classroom_id,
            Alert.alert_type == "NO_SHOW_DETECTED",
            Alert.resolved_at.is_(None),
        )
        .all()
    )
    for a in pending_alerts:
        a.severity = "RESOLVED"
        a.resolved_at = now

    audit = AuditLog(
        entity_type="SIMULATION",
        entity_id=str(event.id),
        action="CANCEL",
        actor="operator",
        details_json=json.dumps({"reason": reason, "classroom_id": event.classroom_id}),
        created_at=now,
    )
    db.add(audit)
    db.commit()
    db.refresh(event)
    return event


def update_countdown_states(db: Session) -> Dict[str, Any]:
    """
    Check all pending simulations whose timer has elapsed.
    Execute automated shutdown, update devices, and publish alerts.
    """
    now = datetime.now(timezone.utc)
    # Fetch all PENDING events and filter comparing UTC timestamps
    all_pending = (
        db.query(SimulationEvent)
        .filter(SimulationEvent.status == "PENDING")
        .all()
    )

    expired_events: List[SimulationEvent] = []
    for ev in all_pending:
        sched = ev.scheduled_action_at
        if sched.tzinfo is None:
            sched = sched.replace(tzinfo=timezone.utc)
        if sched <= now:
            expired_events.append(ev)

    executed_list: List[SimulationEvent] = []
    for event in expired_events:
        classroom = db.query(Classroom).filter(Classroom.id == event.classroom_id).first()
        room_name = classroom.name if classroom else f"Room {event.classroom_id}"

        # Power down devices
        state = db.query(DeviceState).filter(DeviceState.classroom_id == event.classroom_id).first()
        if not state:
            state = DeviceState(classroom_id=event.classroom_id)
            db.add(state)
        state.ac_on = False
        state.fan_on = False
        state.lights_on = False
        state.source = "SIMULATION"
        state.updated_at = now

        event.status = "EXECUTED"

        alert = Alert(
            classroom_id=event.classroom_id,
            severity="INFO",
            title=f"Automated Power Shutdown: {room_name}",
            message=f"All appliances in {room_name} shut down following expired grace period in {event.period_label}.",
            created_at=now,
            alert_type="AUTO_OFF",
        )
        db.add(alert)

        audit = AuditLog(
            entity_type="SIMULATION",
            entity_id=str(event.id),
            action="EXECUTE",
            actor="countdown_daemon",
            details_json=json.dumps({"countdown_expired": True, "classroom_id": event.classroom_id}),
            created_at=now,
        )
        db.add(audit)
        executed_list.append(event)

    db.commit()
    for ev in executed_list:
        db.refresh(ev)

    return {
        "checked_count": len(all_pending),
        "executed_count": len(executed_list),
        "executed_events": executed_list,
    }
