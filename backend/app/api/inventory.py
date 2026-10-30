"""Building inventory: floors, spaces (rooms / common areas) and the devices inside them."""
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.models import Asset, AuditLog, Building, Classroom, DeviceState, Floor, Space
from app.services.inventory_service import (
    CATEGORIES,
    DEVICE_TYPES,
    SPACE_KINDS,
    make_asset,
    space_connected_kw,
    sync_classroom_from_space,
)

router = APIRouter(prefix="/inventory", tags=["Building Inventory"])


# ----------------------------------------------------------------------------- schemas
class AssetIn(BaseModel):
    device_type: str = "OTHER"
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: int = Field(1, ge=0, le=500)
    rated_power_w: Optional[float] = Field(None, ge=0, le=100000)
    standby_power_w: Optional[float] = Field(None, ge=0, le=10000)
    controllable: Optional[bool] = None
    spec_status: Optional[str] = None
    make_model: Optional[str] = None
    sensor_id: Optional[str] = None
    notes: Optional[str] = None


class AssetPatch(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=0, le=500)
    rated_power_w: Optional[float] = Field(None, ge=0, le=100000)
    standby_power_w: Optional[float] = Field(None, ge=0, le=10000)
    controllable: Optional[bool] = None
    spec_status: Optional[str] = None
    make_model: Optional[str] = None
    sensor_id: Optional[str] = None
    notes: Optional[str] = None


class SpaceIn(BaseModel):
    code: str = Field(..., min_length=1, max_length=30)
    name: str = Field(..., min_length=1, max_length=100)
    kind: str = "CLASSROOM"
    capacity: Optional[int] = Field(None, ge=0, le=1000)
    bookable: bool = False
    map_x: int = 0
    map_y: int = 0
    map_w: int = Field(4, ge=1)
    map_h: int = Field(3, ge=1)
    notes: Optional[str] = None


class SpacePatch(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    kind: Optional[str] = None
    capacity: Optional[int] = Field(None, ge=0, le=1000)
    bookable: Optional[bool] = None
    map_x: Optional[int] = None
    map_y: Optional[int] = None
    map_w: Optional[int] = Field(None, ge=1)
    map_h: Optional[int] = Field(None, ge=1)
    notes: Optional[str] = None


class FloorIn(BaseModel):
    level: int
    name: str
    is_pilot: bool = False
    map_width: int = Field(24, ge=4, le=80)
    map_height: int = Field(10, ge=4, le=40)
    notes: Optional[str] = None


class FloorPatch(BaseModel):
    name: Optional[str] = None
    is_pilot: Optional[bool] = None
    map_width: Optional[int] = Field(None, ge=4, le=80)
    map_height: Optional[int] = Field(None, ge=4, le=40)
    notes: Optional[str] = None


# ----------------------------------------------------------------------------- serializers
def asset_out(a: Asset) -> dict:
    return {
        "id": a.id, "space_id": a.space_id, "device_type": a.device_type, "category": a.category,
        "name": a.name, "quantity": a.quantity, "rated_power_w": a.rated_power_w,
        "standby_power_w": a.standby_power_w, "controllable": a.controllable, "spec_status": a.spec_status,
        "make_model": a.make_model, "sensor_id": a.sensor_id, "notes": a.notes,
        "total_rated_kw": round(a.rated_power_w * a.quantity / 1000.0, 3),
    }


def space_out(s: Space) -> dict:
    return {
        "id": s.id, "floor_id": s.floor_id, "code": s.code, "name": s.name, "kind": s.kind,
        "capacity": s.capacity, "bookable": s.bookable, "classroom_id": s.classroom_id,
        "map_x": s.map_x, "map_y": s.map_y, "map_w": s.map_w, "map_h": s.map_h, "notes": s.notes,
        "connected_kw": space_connected_kw(s),
        "estimated_count": sum(1 for a in s.assets if a.spec_status != "VERIFIED"),
        "assets": [asset_out(a) for a in s.assets],
    }


def floor_out(f: Floor) -> dict:
    return {
        "id": f.id, "building_id": f.building_id, "building": f.building.name if f.building else None,
        "level": f.level, "name": f.name, "is_pilot": f.is_pilot, "map_width": f.map_width,
        "map_height": f.map_height, "notes": f.notes,
        "connected_kw": round(sum(space_connected_kw(s) for s in f.spaces), 2),
        "spaces": [space_out(s) for s in f.spaces],
    }


def _audit(db: Session, entity: str, entity_id, action: str, details: dict) -> None:
    db.add(AuditLog(entity_type=entity, entity_id=str(entity_id), action=action, actor="admin",
                    details_json=json.dumps(details, default=str)))


def _check_kind(kind: Optional[str]):
    if kind is not None and kind not in SPACE_KINDS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"kind must be one of {SPACE_KINDS}")


def _check_category(cat: Optional[str]):
    if cat is not None and cat not in CATEGORIES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"category must be one of {CATEGORIES}")


def _get(db: Session, model, obj_id: int):
    obj = db.get(model, obj_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{model.__name__} {obj_id} not found")
    return obj


# ----------------------------------------------------------------------------- catalogue
@router.get("/device-types")
def list_device_types():
    """Device templates with typical (estimated) ratings, used to pre-fill new devices."""
    return [{"key": k, **v} for k, v in DEVICE_TYPES.items()]


@router.get("/meta")
def inventory_meta():
    return {"categories": CATEGORIES, "space_kinds": SPACE_KINDS}


# ----------------------------------------------------------------------------- floors
@router.get("/floors")
def list_floors(db: Session = Depends(get_db)):
    floors = (
        db.query(Floor)
        .options(joinedload(Floor.spaces).joinedload(Space.assets), joinedload(Floor.building))
        .order_by(Floor.level)
        .all()
    )
    return [floor_out(f) for f in floors]


@router.get("/floors/{floor_id}")
def get_floor(floor_id: int, db: Session = Depends(get_db)):
    return floor_out(_get(db, Floor, floor_id))


@router.post("/floors", status_code=status.HTTP_201_CREATED)
def create_floor(payload: FloorIn, db: Session = Depends(get_db)):
    building = db.query(Building).first()
    if not building:
        building = Building(code="L", name="L Block")
        db.add(building)
        db.flush()
    if db.query(Floor).filter(Floor.building_id == building.id, Floor.level == payload.level).first():
        raise HTTPException(status.HTTP_409_CONFLICT, f"Floor level {payload.level} already exists")
    floor = Floor(building_id=building.id, **payload.model_dump())
    db.add(floor)
    db.flush()
    _audit(db, "FLOOR", floor.id, "CREATE", payload.model_dump())
    db.commit()
    db.refresh(floor)
    return floor_out(floor)


@router.patch("/floors/{floor_id}")
def update_floor(floor_id: int, payload: FloorPatch, db: Session = Depends(get_db)):
    floor = _get(db, Floor, floor_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(floor, k, v)
    _audit(db, "FLOOR", floor.id, "UPDATE", payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(floor)
    return floor_out(floor)


@router.delete("/floors/{floor_id}")
def delete_floor(floor_id: int, db: Session = Depends(get_db)):
    floor = _get(db, Floor, floor_id)
    if any(s.classroom_id for s in floor.spaces):
        raise HTTPException(status.HTTP_409_CONFLICT,
                            "Floor has classrooms linked to the timetable; remove those rooms first")
    _audit(db, "FLOOR", floor.id, "DELETE", {"name": floor.name})
    db.delete(floor)
    db.commit()
    return {"deleted": floor_id}


# ----------------------------------------------------------------------------- spaces
@router.post("/floors/{floor_id}/spaces", status_code=status.HTTP_201_CREATED)
def create_space(floor_id: int, payload: SpaceIn, db: Session = Depends(get_db)):
    floor = _get(db, Floor, floor_id)
    _check_kind(payload.kind)
    if db.query(Space).filter(Space.floor_id == floor_id, Space.code == payload.code).first():
        raise HTTPException(status.HTTP_409_CONFLICT, f"Space {payload.code} already exists on this floor")
    space = Space(floor_id=floor_id, **payload.model_dump())
    db.add(space)
    db.flush()

    # Classrooms need a timetable-side Classroom row so they can be scheduled and booked.
    if payload.kind in ("CLASSROOM", "LAB"):
        classroom = db.query(Classroom).filter(Classroom.name == payload.code).first()
        if not classroom:
            classroom = Classroom(name=payload.code, building=floor.building.name, floor=floor.level,
                                  capacity=payload.capacity or 60, connected_load_kw=0.0)
            db.add(classroom)
            db.flush()
            db.add(DeviceState(classroom_id=classroom.id))
        space.classroom_id = classroom.id
    db.flush()
    db.refresh(space)
    sync_classroom_from_space(space)
    _audit(db, "SPACE", space.id, "CREATE", payload.model_dump())
    db.commit()
    db.refresh(space)
    return space_out(space)


@router.patch("/spaces/{space_id}")
def update_space(space_id: int, payload: SpacePatch, db: Session = Depends(get_db)):
    space = _get(db, Space, space_id)
    _check_kind(payload.kind)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(space, k, v)
    if "code" in data and space.classroom:
        space.classroom.name = data["code"]
    sync_classroom_from_space(space)
    _audit(db, "SPACE", space.id, "UPDATE", data)
    db.commit()
    db.refresh(space)
    return space_out(space)


@router.delete("/spaces/{space_id}")
def delete_space(space_id: int, db: Session = Depends(get_db)):
    space = _get(db, Space, space_id)
    if space.classroom_id:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This room is linked to the timetable and bookings. Mark it not bookable instead of deleting.",
        )
    _audit(db, "SPACE", space.id, "DELETE", {"code": space.code})
    db.delete(space)
    db.commit()
    return {"deleted": space_id}


# ----------------------------------------------------------------------------- assets
@router.post("/spaces/{space_id}/assets", status_code=status.HTTP_201_CREATED)
def create_asset(space_id: int, payload: AssetIn, db: Session = Depends(get_db)):
    space = _get(db, Space, space_id)
    _check_category(payload.category)
    overrides = {k: v for k, v in payload.model_dump().items()
                 if v is not None and k in ("name", "category", "rated_power_w", "standby_power_w", "controllable")}
    asset = make_asset(space.id, payload.device_type, payload.quantity, **overrides)
    for k in ("spec_status", "make_model", "sensor_id", "notes"):
        if getattr(payload, k) is not None:
            setattr(asset, k, getattr(payload, k))
    db.add(asset)
    db.flush()
    db.refresh(space)
    sync_classroom_from_space(space)
    _audit(db, "ASSET", asset.id, "CREATE", {"space": space.code, **payload.model_dump()})
    db.commit()
    db.refresh(asset)
    return asset_out(asset)


@router.patch("/assets/{asset_id}")
def update_asset(asset_id: int, payload: AssetPatch, db: Session = Depends(get_db)):
    asset = _get(db, Asset, asset_id)
    _check_category(payload.category)
    data = payload.model_dump(exclude_unset=True)
    if data.get("spec_status") and data["spec_status"] not in ("ESTIMATED", "VERIFIED"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "spec_status must be ESTIMATED or VERIFIED")
    for k, v in data.items():
        setattr(asset, k, v)
    db.flush()
    sync_classroom_from_space(asset.space)
    _audit(db, "ASSET", asset.id, "UPDATE", data)
    db.commit()
    db.refresh(asset)
    return asset_out(asset)


@router.delete("/assets/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = _get(db, Asset, asset_id)
    space = asset.space
    _audit(db, "ASSET", asset.id, "DELETE", {"name": asset.name, "space": space.code})
    db.delete(asset)
    db.flush()
    db.refresh(space)
    sync_classroom_from_space(space)
    db.commit()
    return {"deleted": asset_id}
