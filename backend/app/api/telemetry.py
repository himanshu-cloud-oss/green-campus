"""Live and historical floor telemetry (modelled until metering hardware is installed)."""
import calendar
import json
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import AuditLog, MonthlyEnergyRecord, Space
from app.services.telemetry_service import ASSUMPTIONS, P_ON, FloorModel
from app.clock import now_local, today_local

router = APIRouter(prefix="/telemetry", tags=["Telemetry (simulated)"])


def _parse_at(at: Optional[str]) -> datetime:
    if not at:
        return now_local().replace(microsecond=0)
    try:
        return datetime.fromisoformat(at).replace(tzinfo=None)
    except ValueError:
        raise HTTPException(400, "at must be ISO format, e.g. 2026-10-30T10:15:00")


@router.get("/live")
def live(floor_id: Optional[int] = None, at: Optional[str] = None, db: Session = Depends(get_db)):
    """Per-room, per-device modelled power at an instant (default: now)."""
    return FloorModel(db, floor_id).snapshot(_parse_at(at))


@router.get("/series")
def series(
    hours: float = Query(24, gt=0, le=24 * 7),
    step_min: int = Query(5, ge=1, le=120),
    floor_id: Optional[int] = None,
    end: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Floor power time series ending now (or at `end`)."""
    end_dt = _parse_at(end).replace(second=0)
    end_dt -= timedelta(minutes=end_dt.minute % step_min)
    model = FloorModel(db, floor_id)
    return {"simulated": True, "step_min": step_min,
            "points": model.series(end_dt - timedelta(hours=hours), end_dt, step_min)}


@router.get("/daily")
def daily(days: int = Query(30, ge=1, le=120), floor_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Modelled kWh per day for the last N days (today is partial)."""
    model = FloorModel(db, floor_id)
    today = today_local()
    return {"simulated": True,
            "days": [model.day_energy(today - timedelta(days=i)) for i in range(days - 1, -1, -1)]}


@router.get("/month")
def month_estimate(floor_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    This month's modelled floor kWh (projected to month end) next to the real campus bill
    for the same calendar month. The share is an estimate: the bill is campus-wide.
    """
    model = FloorModel(db, floor_id)
    today = today_local()
    first = today.replace(day=1)
    n_days = calendar.monthrange(today.year, today.month)[1]
    elapsed = [model.day_energy(first + timedelta(days=i)) for i in range(today.day - 1)]
    month_to_date = sum(d["kwh"] for d in elapsed)
    waste_to_date = sum(d["waste_kwh"] for d in elapsed)
    full_days = max(1, len(elapsed))
    projected = month_to_date / full_days * n_days if elapsed else model.day_energy(today)["kwh"] * n_days

    bill = db.query(MonthlyEnergyRecord).filter(MonthlyEnergyRecord.month == today.month).first()
    return {
        "simulated": True,
        "month": today.strftime("%b %Y"),
        "days_elapsed": len(elapsed),
        "month_to_date_kwh": round(month_to_date, 1),
        "waste_to_date_kwh": round(waste_to_date, 1),
        "projected_kwh": round(projected, 1),
        "campus_bill": None if not bill else {
            "month": f"{calendar.month_abbr[bill.month]} {bill.year}",
            "total_kwh": bill.total_kwh, "grid_kwh": bill.grid_kwh,
            "generator_kwh": bill.generator_kwh, "solar_kwh": bill.solar_kwh,
        },
        "floor_share_pct": round(projected / bill.total_kwh * 100, 2) if bill and bill.total_kwh else None,
    }


@router.get("/assumptions")
def assumptions():
    """The behaviour model behind the simulated numbers."""
    return {"assumptions": ASSUMPTIONS, "p_on": P_ON}


@router.post("/cut/{space_id}")
def cut_space(space_id: int, db: Session = Depends(get_db)):
    """
    Switch off a space's controllable loads (simulated until relays exist). Stays armed for
    the rest of today: whenever the space is empty, its switchable devices are kept off.
    """
    space = db.get(Space, space_id)
    if not space:
        raise HTTPException(404, f"Space {space_id} not found")
    space.cut_at = now_local().replace(microsecond=0)
    db.add(AuditLog(entity_type="SPACE", entity_id=str(space.id), action="CUT", actor="admin",
                    details_json=json.dumps({"space": space.code, "at": space.cut_at.isoformat()})))
    db.commit()
    return {"space_id": space.id, "code": space.code, "cut_at": space.cut_at.isoformat()}


@router.delete("/cut/{space_id}")
def release_cut(space_id: int, db: Session = Depends(get_db)):
    """Disarm a cut so the space follows normal behaviour again."""
    space = db.get(Space, space_id)
    if not space:
        raise HTTPException(404, f"Space {space_id} not found")
    space.cut_at = None
    db.add(AuditLog(entity_type="SPACE", entity_id=str(space.id), action="RELEASE", actor="admin",
                    details_json=json.dumps({"space": space.code})))
    db.commit()
    return {"space_id": space.id, "code": space.code, "cut_at": None}
