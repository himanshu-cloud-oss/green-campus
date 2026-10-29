"""Energy analytics, monthly records, daily readings, export, and reconciliation."""
from datetime import date as date_type
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import MonthlyEnergyRecord, DailyEnergyReading
from app.schemas.schemas import (
    MonthlyEnergyRecordOut,
    DailyEnergyReadingOut,
    EnergySummaryOut,
    EnergyValidationOut,
)
from app.services.energy_service import (
    get_energy_summary,
    validate_data_quality,
    generate_csv,
)

router = APIRouter(prefix="/energy", tags=["Energy Analytics"])


@router.get("/monthly", response_model=List[MonthlyEnergyRecordOut])
def get_monthly_records(
    year: Optional[int] = Query(None, description="Filter records by calendar year (e.g. 2024, 2025)"),
    db: Session = Depends(get_db),
):
    """Retrieve historical monthly energy records from campus meters."""
    query = db.query(MonthlyEnergyRecord)
    if year:
        query = query.filter(MonthlyEnergyRecord.year == year)
    records = query.order_by(MonthlyEnergyRecord.year, MonthlyEnergyRecord.month).all()
    
    # Calculate reconciliation fields for response
    results = []
    for r in records:
        comp_sum = r.grid_kwh + r.generator_kwh + r.solar_kwh
        diff = round(abs(comp_sum - r.total_kwh), 2)
        r_dict = {
            "id": r.id,
            "month": r.month,
            "year": r.year,
            "grid_kwh": r.grid_kwh,
            "generator_kwh": r.generator_kwh,
            "solar_kwh": r.solar_kwh,
            "total_kwh": r.total_kwh,
            "notes": r.notes,
            "data_source": r.data_source,
            "reconciled": diff < 1.0,
            "discrepancy_kwh": round(comp_sum - r.total_kwh, 2),
        }
        results.append(r_dict)
    return results


@router.get("/summary", response_model=EnergySummaryOut)
def get_energy_analytics_summary(db: Session = Depends(get_db)):
    """Retrieve campus energy totals, peak/lowest month, solar share, and MoM changes."""
    records = db.query(MonthlyEnergyRecord).all()
    summary = get_energy_summary(records)
    return summary


@router.get("/readings", response_model=List[DailyEnergyReadingOut])
def get_daily_readings(
    start: Optional[date_type] = Query(None, description="Start date (YYYY-MM-DD)"),
    end: Optional[date_type] = Query(None, description="End date (YYYY-MM-DD)"),
    classroom_id: Optional[int] = Query(None, description="Classroom ID (omit for campus-wide)"),
    db: Session = Depends(get_db),
):
    """Retrieve daily energy logs by date window and optional classroom scope."""
    query = db.query(DailyEnergyReading)
    if start:
        query = query.filter(DailyEnergyReading.date >= start)
    if end:
        query = query.filter(DailyEnergyReading.date <= end)
    if classroom_id is not None:
        query = query.filter(DailyEnergyReading.classroom_id == classroom_id)

    readings = query.order_by(DailyEnergyReading.date.desc()).all()
    return readings


@router.get("/export")
def export_energy_csv(db: Session = Depends(get_db)):
    """Export all monthly energy records into an RFC-4180 CSV document."""
    records = db.query(MonthlyEnergyRecord).all()
    csv_data = generate_csv(records)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="mru_energy_monthly.csv"'},
    )


@router.post("/validate", response_model=EnergyValidationOut)
def validate_energy_reconciliation(db: Session = Depends(get_db)):
    """Validate data reconciliation: grid + generator + solar == total for all recorded months."""
    records = db.query(MonthlyEnergyRecord).all()
    validation_report = validate_data_quality(records)
    return validation_report
