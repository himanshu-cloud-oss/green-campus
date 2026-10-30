"""Classroom endpoints for inventory, live status, and device states."""
from datetime import datetime, date as date_type, time as time_type
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Classroom, DeviceState
import json
from datetime import timezone
from app.models.models import AuditLog
from app.schemas.schemas import ClassroomOut, ClassroomStatusOut, DeviceStateOut, DeviceStateUpdate
from app.services.timetable_service import get_occupancy_status, parse_time_str
from app.clock import now_local

router = APIRouter(prefix="/classrooms", tags=["Classrooms"])


@router.get("", response_model=List[ClassroomOut])
def list_classrooms(db: Session = Depends(get_db)):
    """Retrieve all campus classrooms with their connected loads and device states."""
    classrooms = db.query(Classroom).order_by(Classroom.name).all()
    return classrooms


@router.get("/{classroom_id}", response_model=ClassroomOut)
def get_classroom(classroom_id: int, db: Session = Depends(get_db)):
    """Retrieve single classroom details by ID."""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Classroom with ID {classroom_id} not found",
        )
    return classroom


@router.get("/{classroom_id}/status", response_model=ClassroomStatusOut)
def get_classroom_status(
    classroom_id: int,
    weekday: Optional[str] = Query(None, description="Day of week (e.g. MON, TUE, WED)"),
    date: Optional[date_type] = Query(None, description="Target evaluation date (YYYY-MM-DD)"),
    time: Optional[str] = Query(None, description="Target evaluation time (HH:MM or HH:MM:SS)"),
    db: Session = Depends(get_db),
):
    """
    Evaluate real-time or simulated occupancy, period schedule, and potential energy waste.
    Defaults to current system date, time, and weekday if not explicitly provided.
    """
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Classroom with ID {classroom_id} not found",
        )

    now = now_local()
    target_date = date or now.date()
    
    # Determine weekday code
    if weekday:
        target_weekday = weekday.strip().upper()
    else:
        # 0=Monday in Python weekday()
        days_map = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
        target_weekday = days_map[target_date.weekday()]

    # Determine time
    if time:
        try:
            target_time = parse_time_str(time)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid time format '{time}'. Use HH:MM or HH:MM:SS.",
            )
    else:
        target_time = now.time()

    status_data = get_occupancy_status(
        classroom_id=classroom_id,
        weekday=target_weekday,
        t=target_time,
        target_date=target_date,
        db=db,
    )
    return status_data


@router.post("/{classroom_id}/device-state", response_model=DeviceStateOut)
def set_device_state(classroom_id: int, payload: DeviceStateUpdate, db: Session = Depends(get_db)):
    """Admin override of a room's AC / fans / lights group (simulated until relays exist; applies for today)."""
    if not db.get(Classroom, classroom_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Classroom {classroom_id} not found")
    state = db.query(DeviceState).filter(DeviceState.classroom_id == classroom_id).first()
    if not state:
        state = DeviceState(classroom_id=classroom_id)
        db.add(state)
    data = payload.model_dump(exclude_unset=True)
    for key in ("ac_on", "fan_on", "lights_on"):
        if data.get(key) is not None:
            setattr(state, key, data[key])
    state.source = (data.get("source") or "OVERRIDE").upper()
    state.updated_at = datetime.now(timezone.utc)
    db.add(AuditLog(entity_type="DEVICE_STATE", entity_id=str(classroom_id), action="UPDATE", actor="admin",
                    details_json=json.dumps(data, default=str)))
    db.commit()
    db.refresh(state)
    return state
