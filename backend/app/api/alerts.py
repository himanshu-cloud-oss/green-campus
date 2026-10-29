"""Alerts, warnings, and energy notifications API."""
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Alert
from app.schemas.schemas import AlertCreate, AlertUpdate, AlertOut

router = APIRouter(prefix="/alerts", tags=["Alerts & Notifications"])


@router.get("", response_model=List[AlertOut])
def list_alerts(
    severity: Optional[str] = Query(None, description="CRITICAL, WARNING, INFO, RESOLVED"),
    classroom_id: Optional[int] = Query(None, description="Filter by classroom ID"),
    unresolved_only: bool = Query(False, description="Filter only active unresolved alerts"),
    db: Session = Depends(get_db),
):
    """Retrieve campus alerts and notifications with optional filtering."""
    query = db.query(Alert)
    if severity:
        query = query.filter(Alert.severity == severity.upper())
    if classroom_id is not None:
        query = query.filter(Alert.classroom_id == classroom_id)
    if unresolved_only:
        query = query.filter(Alert.resolved_at.is_(None), Alert.severity != "RESOLVED")

    alerts = query.order_by(Alert.created_at.desc()).limit(200).all()
    return alerts


@router.post("", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
def create_custom_alert(payload: AlertCreate, db: Session = Depends(get_db)):
    """Publish a new system, classroom, or energy threshold alert."""
    alert = Alert(
        classroom_id=payload.classroom_id,
        severity=payload.severity.upper(),
        title=payload.title,
        message=payload.message,
        alert_type=payload.alert_type.upper(),
        created_at=datetime.now(timezone.utc),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.patch("/{alert_id}", response_model=AlertOut)
def update_alert(alert_id: int, payload: AlertUpdate, db: Session = Depends(get_db)):
    """Acknowledge or resolve an active alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found",
        )

    now = datetime.now(timezone.utc)
    if payload.acknowledged is True and not alert.acknowledged_at:
        alert.acknowledged_at = now

    if payload.resolved is True:
        alert.resolved_at = now
        alert.severity = "RESOLVED"

    if payload.severity:
        alert.severity = payload.severity.upper()

    db.commit()
    db.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    """Remove an alert from the system."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found",
        )
    db.delete(alert)
    db.commit()
    return None
