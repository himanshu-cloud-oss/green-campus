"""Simulation controls for no-show testing, countdown triggers, and device actuation."""
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import SimulationEvent
from app.schemas.schemas import (
    NoShowSimulationCreate,
    SimulationEventOut,
    CountdownUpdateResult,
)
from app.services.simulation_service import (
    create_no_show_simulation,
    execute_simulation_early,
    cancel_simulation,
    update_countdown_states,
)

router = APIRouter(prefix="/simulations", tags=["Simulations & Automation"])


def serialize_simulation(event: SimulationEvent) -> SimulationEventOut:
    """Helper to attach remaining countdown seconds for output serialization."""
    now = datetime.now(timezone.utc)
    rem = 0.0
    if event.status == "PENDING":
        # Handle timezone comparison safely
        sched = event.scheduled_action_at
        if sched.tzinfo is None:
            sched = sched.replace(tzinfo=timezone.utc)
        diff = (sched - now).total_seconds()
        rem = round(max(0.0, diff), 1)

    return SimulationEventOut(
        id=event.id,
        classroom_id=event.classroom_id,
        event_type=event.event_type,
        triggered_at=event.triggered_at,
        scheduled_action_at=event.scheduled_action_at,
        status=event.status,
        period_label=event.period_label,
        notes=event.notes,
        seconds_remaining=rem,
    )


@router.post("/no-show", response_model=SimulationEventOut, status_code=status.HTTP_201_CREATED)
def trigger_no_show_simulation(
    payload: NoShowSimulationCreate, db: Session = Depends(get_db)
):
    """
    Initiate a no-show classroom simulation.
    Triggers countdown timer and queues automated power shutdown.
    """
    try:
        event = create_no_show_simulation(
            classroom_id=payload.classroom_id,
            period_label=payload.period_label,
            slot_start=payload.slot_start,
            slot_end=payload.slot_end,
            db=db,
            notes=payload.notes,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    return serialize_simulation(event)


@router.get("", response_model=List[SimulationEventOut])
def list_simulations(db: Session = Depends(get_db)):
    """List all simulation events in reverse chronological order."""
    events = (
        db.query(SimulationEvent)
        .order_by(SimulationEvent.triggered_at.desc())
        .limit(100)
        .all()
    )
    return [serialize_simulation(ev) for ev in events]


@router.patch("/{simulation_id}/cancel", response_model=SimulationEventOut)
def cancel_active_simulation(simulation_id: int, db: Session = Depends(get_db)):
    """Cancel a pending simulation (e.g., if faculty or students arrive)."""
    try:
        ev = cancel_simulation(simulation_id=simulation_id, db=db, reason="Teacher arrived")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    return serialize_simulation(ev)


@router.patch("/{simulation_id}/execute", response_model=SimulationEventOut)
def force_execute_simulation(simulation_id: int, db: Session = Depends(get_db)):
    """Manually force execution of a simulation, immediately shutting down devices."""
    try:
        ev = execute_simulation_early(simulation_id=simulation_id, db=db)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    return serialize_simulation(ev)


@router.post("/update-countdowns", response_model=CountdownUpdateResult)
def process_countdown_timers(db: Session = Depends(get_db)):
    """
    Backend evaluation routine to process elapsed countdowns and actuate shutdown.
    Intended to be called by frontend interval or background scheduler.
    """
    res = update_countdown_states(db)
    serialized_events = [serialize_simulation(ev) for ev in res["executed_events"]]
    return CountdownUpdateResult(
        checked_count=res["checked_count"],
        executed_count=res["executed_count"],
        executed_events=serialized_events,
    )
