"""Timetable and academic period endpoints."""
from datetime import datetime, date as date_type
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import TimetableEntry, Classroom
from app.schemas.schemas import TimetableEntryOut, PeriodDefinition, ClassroomStatusOut
from app.services.timetable_service import (
    get_all_periods,
    get_current_period,
    get_occupancy_status,
    parse_time_str,
)

router = APIRouter(prefix="/timetable", tags=["Timetable"])


@router.get("/periods", response_model=List[PeriodDefinition])
def list_periods():
    """Retrieve standard campus academic periods timetable schedule (Periods 1-10 + Lunch)."""
    return get_all_periods()


@router.get("", response_model=List[TimetableEntryOut])
def get_timetable(
    weekday: Optional[str] = Query(None, description="Day of week (e.g. MON, TUE, WED, THU, FRI)"),
    classroom_id: Optional[int] = Query(None, description="Filter by classroom ID"),
    db: Session = Depends(get_db),
):
    """Retrieve scheduled academic timetable entries filtered by day or classroom."""
    query = db.query(TimetableEntry)
    if weekday:
        w_code = weekday.strip().upper()[:3]
        query = query.filter(TimetableEntry.day_of_week == w_code)
    if classroom_id:
        query = query.filter(TimetableEntry.classroom_id == classroom_id)

    entries = query.order_by(TimetableEntry.day_of_week, TimetableEntry.start_time).all()
    return entries


@router.get("/current")
def get_current_timetable_status(
    date: Optional[date_type] = Query(None, description="Evaluation date (YYYY-MM-DD)"),
    time: Optional[str] = Query(None, description="Evaluation time (HH:MM or HH:MM:SS)"),
    classroom_id: Optional[int] = Query(None, description="Classroom ID (optional; all if omitted)"),
    db: Session = Depends(get_db),
):
    """
    Evaluate currently active period and occupancy across classrooms.
    If classroom_id is provided, returns single classroom status.
    If omitted, returns current status across all active campus classrooms.
    """
    now = datetime.now()
    target_date = date or now.date()

    if time:
        try:
            target_time = parse_time_str(time)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid time format '{time}'. Use HH:MM.",
            )
    else:
        target_time = now.time()

    days_map = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    target_weekday = days_map[target_date.weekday()]
    period_info = get_current_period(target_time)

    if classroom_id is not None:
        classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
        if not classroom:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Classroom {classroom_id} not found",
            )
        status_info = get_occupancy_status(
            classroom_id=classroom_id,
            weekday=target_weekday,
            t=target_time,
            target_date=target_date,
            db=db,
        )
        return {
            "period": period_info,
            "evaluation_time": target_time.strftime("%H:%M:%S"),
            "date": target_date.isoformat(),
            "weekday": target_weekday,
            "status": status_info,
        }

    # Evaluate across all classrooms
    classrooms = db.query(Classroom).order_by(Classroom.name).all()
    room_statuses = []
    for c in classrooms:
        s = get_occupancy_status(
            classroom_id=c.id,
            weekday=target_weekday,
            t=target_time,
            target_date=target_date,
            db=db,
        )
        room_statuses.append(s)

    return {
        "period": period_info,
        "evaluation_time": target_time.strftime("%H:%M:%S"),
        "date": target_date.isoformat(),
        "weekday": target_weekday,
        "classrooms": room_statuses,
    }
