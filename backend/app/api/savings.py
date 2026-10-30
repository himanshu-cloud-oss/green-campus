"""Energy and monetary savings estimation, what-if modeling, and historical runs."""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import SavingsRun, Classroom
from app.schemas.schemas import (
    SavingsEstimateResponse,
    SavingsCalculationRequest,
    SavingsRunOut,
    WhatIfResponse,
)
from app.services.savings_service import (
    estimate_savings,
    calculate_whatif,
    record_savings_run,
)

from app.services.savings_model import SavingsModelRequest, run_model

router = APIRouter(prefix="/savings", tags=["Savings Analytics"])


@router.post("/model")
def savings_model(payload: SavingsModelRequest, db: Session = Depends(get_db)):
    """Annual baseline vs automated energy for the pilot floor, using inventory + timetable."""
    return run_model(db, payload)


@router.get("/model/defaults")
def savings_model_defaults():
    return SavingsModelRequest().model_dump()


@router.get("/estimate", response_model=SavingsEstimateResponse)
def get_savings_estimate(
    classroom_ids: str = Query(..., description="Comma-separated classroom IDs (e.g. '1,2,3')"),
    hours: float = Query(1.0, ge=0.1, le=24.0, description="Hours of runtime avoided"),
    days: int = Query(1, ge=1, le=365, description="Number of operational days"),
    tariff: Optional[float] = Query(None, description="Tariff in INR/kWh (defaults to 8.50)"),
    load_kw: Optional[float] = Query(None, description="Load in kW (defaults to 2.4 kW)"),
):
    """
    Instantly calculate projected energy conservation, cost savings in INR,
    and CO2 abatement for avoided operational hours. Deduplicates classroom inputs.
    """
    try:
        c_ids = [int(x.strip()) for x in classroom_ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="classroom_ids must be a comma-separated list of integers",
        )

    if not c_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one classroom ID must be specified",
        )

    result = estimate_savings(
        classroom_ids=c_ids,
        hours_avoided=hours,
        days=days,
        tariff_per_kwh=tariff,
        load_kw=load_kw,
    )
    return result


@router.post("/calculate", response_model=SavingsRunOut, status_code=status.HTTP_201_CREATED)
def calculate_and_persist_savings(
    payload: SavingsCalculationRequest, db: Session = Depends(get_db)
):
    """Execute savings calculation and persist the run into the audit records."""
    if not payload.classroom_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must specify at least one classroom ID",
        )

    run = record_savings_run(
        classroom_ids=payload.classroom_ids,
        hours_avoided=payload.hours_avoided,
        days=payload.days,
        calculation_type=payload.calculation_type,
        tariff_per_kwh=payload.tariff_per_kwh,
        load_kw=payload.load_kw,
        db=db,
    )
    return run


@router.get("/history", response_model=List[SavingsRunOut])
def list_savings_history(db: Session = Depends(get_db)):
    """Retrieve history of saved calculations and what-if runs."""
    runs = db.query(SavingsRun).order_by(SavingsRun.run_at.desc()).limit(50).all()
    return runs


@router.get("/whatif", response_model=WhatIfResponse)
def get_whatif_analysis(db: Session = Depends(get_db)):
    """
    Retrieve what-if analysis parameters, campus load defaults,
    and pre-calculated high-impact policy scenarios.
    """
    classroom_count = db.query(Classroom).count()
    if classroom_count == 0:
        classroom_count = 5

    loads = [c.connected_load_kw for c in db.query(Classroom).all() if c.connected_load_kw]
    avg_load = round(sum(loads) / len(loads), 2) if loads else None
    res = calculate_whatif(classroom_count=classroom_count, load_kw=avg_load)
    return res
