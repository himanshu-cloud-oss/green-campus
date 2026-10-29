"""Audit log inspection and operational system settings API."""
import json
from datetime import datetime, timezone, date as date_type
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import AuditLog, Setting
from app.schemas.schemas import AuditLogOut, SettingOut, SettingUpdate

router = APIRouter(tags=["System Administration & Audit"])


@router.get("/audit-log", response_model=List[AuditLogOut])
def list_audit_logs(
    entity_type: Optional[str] = Query(None, description="Filter by entity type (e.g. BOOKING, SIMULATION, SETTING)"),
    start: Optional[date_type] = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    limit: int = Query(50, ge=1, le=500, description="Max entries to return"),
    db: Session = Depends(get_db),
):
    """Retrieve system audit logs for administrative monitoring and tracking."""
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type.upper())
    if start:
        start_dt = datetime.combine(start, datetime.min.time())
        query = query.filter(AuditLog.created_at >= start_dt)

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return logs


@router.get("/settings", response_model=List[SettingOut])
def list_settings(db: Session = Depends(get_db)):
    """Retrieve all operational system parameters and tariff configuration."""
    settings = db.query(Setting).order_by(Setting.key).all()
    return settings


@router.patch("/settings/{key}", response_model=SettingOut)
def update_setting(key: str, payload: SettingUpdate, db: Session = Depends(get_db)):
    """Update a specific system parameter with audit tracking."""
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting '{key}' not found",
        )

    old_val = setting.value
    setting.value = payload.value
    now = datetime.now(timezone.utc)
    setting.updated_at = now

    audit = AuditLog(
        entity_type="SETTING",
        entity_id=key,
        action="UPDATE",
        actor="administrator",
        details_json=json.dumps({"old_value": old_val, "new_value": payload.value}),
        created_at=now,
    )
    db.add(audit)
    db.commit()
    db.refresh(setting)
    return setting
