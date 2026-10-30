"""Forecasting intelligence, statistical anomalies, and timetable-aware recommendations."""
import json
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import (
    MonthlyEnergyRecord,
    ForecastRun,
    Classroom,
    TimetableEntry,
    DailyEnergyReading,
)
from app.schemas.schemas import (
    ForecastRequest,
    ForecastRunOut,
    AnomalyDetectionOut,
    RecommendationsOut,
)


def _ml():
    """Import the ML stack lazily: it is optional (left out of the Vercel build to stay under the size limit)."""
    try:
        from app.ml.forecasting import ForecastingService
        from app.ml.anomaly_detection import AnomalyDetectionService
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Forecasting needs numpy, pandas and scikit-learn, which aren't installed in this deployment.",
        )
    return ForecastingService, AnomalyDetectionService

router = APIRouter(prefix="/forecast", tags=["Forecasting & Intelligence"])


@router.post("", response_model=ForecastRunOut, status_code=status.HTTP_201_CREATED)
def generate_energy_forecast(payload: ForecastRequest, db: Session = Depends(get_db)):
    ForecastingService, _ = _ml()
    """
    Train and execute time-series energy forecasting model.
    Enforces minimum 12 historical monthly records before executing.
    Supported models: 'seasonal_naive', 'linear', 'random_forest'.
    """
    records = db.query(MonthlyEnergyRecord).all()
    sufficiency = ForecastingService.check_data_sufficiency(records)
    if not sufficiency["sufficient"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=sufficiency,
        )

    model_type = payload.model_type.lower().strip()
    periods = max(1, min(12, payload.periods))

    if model_type in ("seasonal_naive", "naive"):
        model_name = "seasonal_naive"
        result = ForecastingService.run_seasonal_naive(records, periods_ahead=periods)
    elif model_type in ("linear", "linear_regression"):
        model_name = "linear_regression"
        result = ForecastingService.run_linear_regression(records, periods_ahead=periods)
    elif model_type in ("random_forest", "rf"):
        model_name = "random_forest"
        result = ForecastingService.run_random_forest(records, periods_ahead=periods)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported model_type '{payload.model_type}'. Choose from 'seasonal_naive', 'linear', or 'random_forest'.",
        )

    # Persist the forecast run
    forecast_run = ForecastRun(
        model_name=model_name,
        training_period_start=result["training_period_start"],
        training_period_end=result["training_period_end"],
        forecast_period=result["forecast_period"],
        predicted_kwh=json.dumps(result["forecast"]),
        rmse=result["metrics"]["rmse"],
        mae=result["metrics"]["mae"],
        status="SUCCESS",
        run_at=datetime.now(timezone.utc),
    )
    db.add(forecast_run)
    db.commit()
    db.refresh(forecast_run)

    return ForecastRunOut(
        id=forecast_run.id,
        model_name=forecast_run.model_name,
        training_period_start=forecast_run.training_period_start,
        training_period_end=forecast_run.training_period_end,
        forecast_period=forecast_run.forecast_period,
        predicted_kwh=result["forecast"],
        rmse=forecast_run.rmse,
        mae=forecast_run.mae,
        status=forecast_run.status,
        run_at=forecast_run.run_at,
        data_sufficient=True,
    )


@router.get("/history", response_model=List[ForecastRunOut])
def list_forecast_history(db: Session = Depends(get_db)):
    """Retrieve history of saved forecasting model runs."""
    runs = db.query(ForecastRun).order_by(ForecastRun.run_at.desc()).limit(20).all()
    results = []
    for r in runs:
        try:
            preds = json.loads(r.predicted_kwh)
        except Exception:
            preds = []
        results.append(
            ForecastRunOut(
                id=r.id,
                model_name=r.model_name,
                training_period_start=r.training_period_start,
                training_period_end=r.training_period_end,
                forecast_period=r.forecast_period,
                predicted_kwh=preds,
                rmse=r.rmse,
                mae=r.mae,
                status=r.status,
                run_at=r.run_at,
                data_sufficient=True,
            )
        )
    return results


@router.get("/anomalies", response_model=AnomalyDetectionOut)
def detect_consumption_anomalies(db: Session = Depends(get_db)):
    _, AnomalyDetectionService = _ml()
    """Detect statistical outliers, summer surges, and winter drops across campus records."""
    records = db.query(MonthlyEnergyRecord).all()
    report = AnomalyDetectionService.detect_anomalies(records)
    return report


@router.get("/recommendations", response_model=RecommendationsOut)
def get_green_campus_recommendations(db: Session = Depends(get_db)):
    _, AnomalyDetectionService = _ml()
    """Generate actionable, timetable-aware sustainability recommendations."""
    classrooms = db.query(Classroom).all()
    timetable = db.query(TimetableEntry).all()
    readings = db.query(DailyEnergyReading).all()

    recs = AnomalyDetectionService.generate_recommendations(
        classrooms=classrooms,
        timetable=timetable,
        readings=readings,
    )
    return recs


@router.get("/{forecast_id}", response_model=ForecastRunOut)
def get_forecast_run(forecast_id: int, db: Session = Depends(get_db)):
    """Retrieve details and projections for a specific historical forecast run."""
    run = db.query(ForecastRun).filter(ForecastRun.id == forecast_id).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forecast run {forecast_id} not found",
        )
    try:
        preds = json.loads(run.predicted_kwh)
    except Exception:
        preds = []

    return ForecastRunOut(
        id=run.id,
        model_name=run.model_name,
        training_period_start=run.training_period_start,
        training_period_end=run.training_period_end,
        forecast_period=run.forecast_period,
        predicted_kwh=preds,
        rmse=run.rmse,
        mae=run.mae,
        status=run.status,
        run_at=run.run_at,
        data_sufficient=True,
    )
