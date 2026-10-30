"""Extra class bookings management with conflict detection and audit tracking."""
import json
from datetime import datetime, timezone, date as date_type
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.database import get_db
from app.models.models import ExtraClassBooking, Classroom, TimetableEntry, AuditLog
from app.schemas.schemas import AutoBookingRequest, BookingCreate, BookingUpdate, BookingOut
from app.services.booking_service import find_slots

router = APIRouter(prefix="/bookings", tags=["Extra Class Bookings"])


def check_conflicts(
    classroom_id: int,
    b_date: date_type,
    start_t,
    end_t,
    db: Session,
    exclude_booking_id: Optional[int] = None,
) -> Optional[str]:
    """
    Verify there are no overlapping active extra bookings or scheduled timetable classes.
    Returns error string if conflict exists, None otherwise.
    """
    # 1. Check overlapping active extra class bookings
    query = db.query(ExtraClassBooking).filter(
        ExtraClassBooking.classroom_id == classroom_id,
        ExtraClassBooking.date == b_date,
        ExtraClassBooking.status == "ACTIVE",
        ExtraClassBooking.start_time < end_t,
        ExtraClassBooking.end_time > start_t,
    )
    if exclude_booking_id:
        query = query.filter(ExtraClassBooking.id != exclude_booking_id)

    conflict_booking = query.first()
    if conflict_booking:
        return (
            f"Time conflict with existing booking '{conflict_booking.subject}' "
            f"({conflict_booking.start_time.strftime('%H:%M')} - {conflict_booking.end_time.strftime('%H:%M')})"
        )

    # 2. Check scheduled timetable regular classes on this day of week
    days_map = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    weekday_code = days_map[b_date.weekday()]

    conflict_class = (
        db.query(TimetableEntry)
        .filter(
            TimetableEntry.classroom_id == classroom_id,
            TimetableEntry.day_of_week == weekday_code,
            TimetableEntry.start_time < end_t,
            TimetableEntry.end_time > start_t,
        )
        .first()
    )
    if conflict_class:
        return (
            f"Time conflict with regular timetable class '{conflict_class.subject}' "
            f"({conflict_class.teacher}, {conflict_class.start_time.strftime('%H:%M')} - {conflict_class.end_time.strftime('%H:%M')})"
        )

    return None


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db)):
    """Book a classroom for an ad-hoc or extra class with collision verification."""
    classroom = db.query(Classroom).filter(Classroom.id == payload.classroom_id).first()
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Classroom {payload.classroom_id} not found",
        )

    conflict_reason = check_conflicts(
        classroom_id=payload.classroom_id,
        b_date=payload.date,
        start_t=payload.start_time,
        end_t=payload.end_time,
        db=db,
    )
    if conflict_reason:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=conflict_reason,
        )

    now = datetime.now(timezone.utc)
    booking = ExtraClassBooking(
        classroom_id=payload.classroom_id,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        subject=payload.subject,
        expected_students=payload.expected_students,
        notes=payload.notes,
        status="ACTIVE",
        source=(payload.source or "MANUAL").upper(),
        requested_by=payload.requested_by,
        created_at=now,
        updated_at=now,
    )
    db.add(booking)
    db.flush()

    audit = AuditLog(
        entity_type="BOOKING",
        entity_id=str(booking.id),
        action="CREATE",
        actor="auto_scheduler" if (payload.source or "").upper() == "AUTO" else "academic_scheduler",
        details_json=json.dumps({
            "classroom": classroom.name,
            "date": payload.date.isoformat(),
            "time": f"{payload.start_time.strftime('%H:%M')}-{payload.end_time.strftime('%H:%M')}",
            "subject": payload.subject,
            "expected_students": payload.expected_students,
        }),
        created_at=now,
    )
    db.add(audit)
    db.commit()
    db.refresh(booking)
    return booking


@router.post("/auto")
def auto_book(payload: AutoBookingRequest, db: Session = Depends(get_db)):
    """
    Find the lowest-energy free room and slot for an extra class and (by default) book it.
    Returns the chosen slot plus ranked alternatives; with auto_book=false it only suggests.
    """
    result = find_slots(
        db,
        start_date=payload.date,
        search_days=payload.search_days,
        window_start=payload.window_start,
        window_end=payload.window_end,
        duration_minutes=payload.duration_minutes,
        expected_students=payload.expected_students,
        needs=payload.needs,
        align_to_periods=payload.align_to_periods,
        allow_lunch=payload.allow_lunch,
        include_weekends=payload.include_weekends,
    )
    candidates = result["candidates"]
    response = {
        "booked": None,
        "chosen": candidates[0] if candidates else None,
        "alternatives": candidates[1:6],
        "total_options": len(candidates),
        "eligible_rooms": result["eligible_rooms"],
        "rejected_rooms": result["rejected_rooms"],
        "days_searched": result["days_searched"],
    }
    if not candidates:
        response["message"] = "No free room fits this request. Widen the time window, add days, or reduce students."
        return response
    if not payload.auto_book:
        response["message"] = f"Best option: {candidates[0]['room']} {candidates[0]['date']} {candidates[0]['start_time']}"
        return response

    best = candidates[0]
    booking = create_booking(
        BookingCreate(
            classroom_id=best["classroom_id"],
            date=date_type.fromisoformat(best["date"]),
            start_time=datetime.strptime(best["start_time"], "%H:%M").time(),
            end_time=datetime.strptime(best["end_time"], "%H:%M").time(),
            subject=payload.subject,
            expected_students=payload.expected_students,
            notes=payload.notes,
            source="AUTO",
            requested_by=payload.requested_by,
        ),
        db,
    )
    response["booked"] = BookingOut.model_validate(booking).model_dump(mode="json")
    response["message"] = (
        f"Booked {best['room']} on {best['date']} {best['start_time']}-{best['end_time']} "
        f"(est. {best['est_kwh']} kWh, Rs {best['est_cost_inr']})"
    )
    return response


@router.get("", response_model=List[BookingOut])
def list_bookings(
    classroom_id: Optional[int] = Query(None, description="Filter by classroom ID"),
    date: Optional[date_type] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE / CANCELLED)"),
    db: Session = Depends(get_db),
):
    """List classroom bookings filtered by classroom, date, or status."""
    query = db.query(ExtraClassBooking)
    if classroom_id:
        query = query.filter(ExtraClassBooking.classroom_id == classroom_id)
    if date:
        query = query.filter(ExtraClassBooking.date == date)
    if status:
        query = query.filter(ExtraClassBooking.status == status.upper())

    bookings = query.order_by(ExtraClassBooking.date.desc(), ExtraClassBooking.start_time).all()
    return bookings


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, db: Session = Depends(get_db)):
    """Retrieve details for a single booking."""
    booking = db.query(ExtraClassBooking).filter(ExtraClassBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found",
        )
    return booking


@router.patch("/{booking_id}", response_model=BookingOut)
def update_booking(booking_id: int, payload: BookingUpdate, db: Session = Depends(get_db)):
    """Update details or reschedule an extra class booking with collision verification."""
    booking = db.query(ExtraClassBooking).filter(ExtraClassBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found",
        )

    new_start = payload.start_time or booking.start_time
    new_end = payload.end_time or booking.end_time

    # If rescheduling time, check conflicts
    if payload.start_time is not None or payload.end_time is not None:
        conflict_reason = check_conflicts(
            classroom_id=booking.classroom_id,
            b_date=booking.date,
            start_t=new_start,
            end_t=new_end,
            db=db,
            exclude_booking_id=booking.id,
        )
        if conflict_reason:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=conflict_reason,
            )
        booking.start_time = new_start
        booking.end_time = new_end

    if payload.subject is not None:
        booking.subject = payload.subject
    if payload.expected_students is not None:
        booking.expected_students = payload.expected_students
    if payload.notes is not None:
        booking.notes = payload.notes
    if payload.status is not None:
        booking.status = payload.status.upper()

    now = datetime.now(timezone.utc)
    booking.updated_at = now

    audit = AuditLog(
        entity_type="BOOKING",
        entity_id=str(booking.id),
        action="UPDATE",
        actor="academic_scheduler",
        details_json=json.dumps(payload.model_dump(exclude_unset=True), default=str),
        created_at=now,
    )
    db.add(audit)
    db.commit()
    db.refresh(booking)
    return booking


@router.delete("/{booking_id}", response_model=BookingOut)
def cancel_booking(booking_id: int, db: Session = Depends(get_db)):
    """Soft delete/cancel a booking by setting status to CANCELLED."""
    booking = db.query(ExtraClassBooking).filter(ExtraClassBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found",
        )

    now = datetime.now(timezone.utc)
    booking.status = "CANCELLED"
    booking.updated_at = now

    audit = AuditLog(
        entity_type="BOOKING",
        entity_id=str(booking.id),
        action="CANCEL",
        actor="academic_scheduler",
        details_json=json.dumps({"status": "CANCELLED"}),
        created_at=now,
    )
    db.add(audit)
    db.commit()
    db.refresh(booking)
    return booking
