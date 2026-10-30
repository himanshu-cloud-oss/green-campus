"""Building inventory: device catalogue, default floor layout, and load roll-ups.

All seeded power ratings are typical market values for Indian institutional
equipment, marked ESTIMATED until real hardware specs are entered.
"""
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from app.models.models import Building, Floor, Space, Asset, Classroom

CATEGORIES = ["HVAC", "FAN", "LIGHTING", "AV", "IT", "APPLIANCE", "OTHER"]

SPACE_KINDS = ["CLASSROOM", "LAB", "STAFF_ROOM", "CORRIDOR", "WASHROOM", "COMMON", "OTHER"]

# key -> template. duty = average fraction of rated power drawn while "on"
# (compressors and heating elements cycle; LEDs and fans do not).
DEVICE_TYPES: Dict[str, Dict[str, Any]] = {
    "LED_PANEL":       {"name": "LED panel 2x2 ft",          "category": "LIGHTING",  "rated_w": 36,   "standby_w": 0,  "controllable": True,  "duty": 1.0},
    "LED_TUBE":        {"name": "LED tube 4 ft",             "category": "LIGHTING",  "rated_w": 20,   "standby_w": 0,  "controllable": True,  "duty": 1.0},
    "LED_BULB":        {"name": "LED bulb",                  "category": "LIGHTING",  "rated_w": 9,    "standby_w": 0,  "controllable": True,  "duty": 1.0},
    "CEILING_FAN":     {"name": "Ceiling fan (induction)",   "category": "FAN",       "rated_w": 75,   "standby_w": 0,  "controllable": True,  "duty": 0.85},
    "CEILING_FAN_BLDC":{"name": "Ceiling fan (BLDC)",        "category": "FAN",       "rated_w": 28,   "standby_w": 0.5,"controllable": True,  "duty": 0.85},
    "EXHAUST_FAN":     {"name": "Exhaust fan",               "category": "FAN",       "rated_w": 40,   "standby_w": 0,  "controllable": True,  "duty": 1.0},
    "SPLIT_AC_1_5T":   {"name": "Split AC 1.5 ton",          "category": "HVAC",      "rated_w": 1600, "standby_w": 5,  "controllable": True,  "duty": 0.75},
    "SPLIT_AC_2T":     {"name": "Split AC 2 ton",            "category": "HVAC",      "rated_w": 2100, "standby_w": 5,  "controllable": True,  "duty": 0.75},
    "SMARTBOARD":      {"name": "Interactive smartboard",    "category": "AV",        "rated_w": 250,  "standby_w": 20, "controllable": True,  "duty": 1.0},
    "PROJECTOR":       {"name": "Projector",                 "category": "AV",        "rated_w": 300,  "standby_w": 3,  "controllable": True,  "duty": 1.0},
    "PA_SYSTEM":       {"name": "PA / speaker system",       "category": "AV",        "rated_w": 60,   "standby_w": 5,  "controllable": True,  "duty": 0.6},
    "DESKTOP_PC":      {"name": "Desktop PC + monitor",      "category": "IT",        "rated_w": 120,  "standby_w": 3,  "controllable": False, "duty": 0.7},
    "PRINTER":         {"name": "Laser printer",             "category": "IT",        "rated_w": 350,  "standby_w": 8,  "controllable": False, "duty": 0.1},
    "WIFI_AP":         {"name": "Wi-Fi access point",        "category": "IT",        "rated_w": 15,   "standby_w": 15, "controllable": False, "duty": 1.0},
    "CCTV_CAMERA":     {"name": "CCTV camera",               "category": "IT",        "rated_w": 6,    "standby_w": 6,  "controllable": False, "duty": 1.0},
    "WATER_COOLER":    {"name": "Water cooler",              "category": "APPLIANCE", "rated_w": 600,  "standby_w": 0,  "controllable": False, "duty": 0.35},
    "WATER_DISPENSER": {"name": "Hot/cold water dispenser",  "category": "APPLIANCE", "rated_w": 500,  "standby_w": 0,  "controllable": False, "duty": 0.25},
    "OTHER":           {"name": "Other device",              "category": "OTHER",     "rated_w": 100,  "standby_w": 0,  "controllable": True,  "duty": 1.0},
}

# Which legacy room switch (DeviceState column) drives each category.
CATEGORY_SWITCH = {"HVAC": "ac_on", "FAN": "fan_on", "LIGHTING": "lights_on"}


def device_duty(device_type: str) -> float:
    return DEVICE_TYPES.get(device_type, DEVICE_TYPES["OTHER"])["duty"]


def _assets(*items) -> List[Dict[str, Any]]:
    return [{"device_type": t, "quantity": q} for t, q in items]


LARGE_CLASSROOM = _assets(("LED_PANEL", 12), ("CEILING_FAN", 6), ("SPLIT_AC_2T", 2), ("SMARTBOARD", 1))
SMALL_CLASSROOM = _assets(("LED_PANEL", 8), ("CEILING_FAN", 4), ("SPLIT_AC_1_5T", 2), ("SMARTBOARD", 1))

# Approximate L Block 2nd floor layout: rooms either side of a central corridor (grid 24 x 10).
FLOOR2_SPACES = [
    {"code": "LS-03", "name": "Classroom LS-03", "kind": "CLASSROOM", "capacity": 60, "bookable": True,
     "rect": (0, 0, 6, 4), "assets": LARGE_CLASSROOM},
    {"code": "LS-04", "name": "Classroom LS-04", "kind": "CLASSROOM", "capacity": 40, "bookable": True,
     "rect": (6, 0, 4, 4), "assets": SMALL_CLASSROOM},
    {"code": "LS-05", "name": "Staff room", "kind": "STAFF_ROOM", "capacity": 12, "bookable": False,
     "rect": (10, 0, 5, 4),
     "assets": _assets(("LED_PANEL", 10), ("CEILING_FAN", 4), ("SPLIT_AC_1_5T", 2), ("DESKTOP_PC", 6),
                       ("PRINTER", 1), ("WATER_DISPENSER", 1))},
    {"code": "WR-1", "name": "Washroom (gents)", "kind": "WASHROOM", "capacity": None, "bookable": False,
     "rect": (15, 0, 3, 4), "assets": _assets(("LED_BULB", 6), ("EXHAUST_FAN", 2))},
    {"code": "COR-2", "name": "Corridor & lobby", "kind": "CORRIDOR", "capacity": None, "bookable": False,
     "rect": (0, 4, 24, 2),
     "assets": _assets(("LED_TUBE", 16), ("WATER_COOLER", 1), ("WIFI_AP", 3), ("CCTV_CAMERA", 4))},
    {"code": "LS-08", "name": "Classroom LS-08", "kind": "CLASSROOM", "capacity": 40, "bookable": True,
     "rect": (0, 6, 4, 4), "assets": SMALL_CLASSROOM},
    {"code": "LS-09", "name": "Classroom LS-09", "kind": "CLASSROOM", "capacity": 60, "bookable": True,
     "rect": (4, 6, 6, 4), "assets": LARGE_CLASSROOM},
    {"code": "LS-10", "name": "Classroom LS-10", "kind": "CLASSROOM", "capacity": 60, "bookable": True,
     "rect": (10, 6, 6, 4), "assets": LARGE_CLASSROOM},
    {"code": "WR-2", "name": "Washroom (ladies)", "kind": "WASHROOM", "capacity": None, "bookable": False,
     "rect": (16, 6, 3, 4), "assets": _assets(("LED_BULB", 6), ("EXHAUST_FAN", 2))},
    {"code": "STR-2", "name": "Stairs & lift lobby", "kind": "COMMON", "capacity": None, "bookable": False,
     "rect": (18, 0, 6, 4), "assets": _assets(("LED_TUBE", 6))},
]


def make_asset(space_id: int, device_type: str, quantity: int = 1, **overrides) -> Asset:
    t = DEVICE_TYPES.get(device_type, DEVICE_TYPES["OTHER"])
    return Asset(
        space_id=space_id,
        device_type=device_type,
        category=overrides.get("category", t["category"]),
        name=overrides.get("name", t["name"]),
        quantity=quantity,
        rated_power_w=overrides.get("rated_power_w", t["rated_w"]),
        standby_power_w=overrides.get("standby_power_w", t["standby_w"]),
        controllable=overrides.get("controllable", t["controllable"]),
        spec_status="ESTIMATED",
    )


def space_connected_kw(space: Space) -> float:
    return round(sum(a.rated_power_w * a.quantity for a in space.assets) / 1000.0, 2)


def sync_classroom_from_space(space: Space) -> None:
    """Keep the timetable-side Classroom row consistent with its inventory Space."""
    if space.classroom is None:
        return
    space.classroom.connected_load_kw = space_connected_kw(space)
    if space.capacity:
        space.classroom.capacity = space.capacity
    space.classroom.floor = space.floor.level if space.floor else space.classroom.floor
    space.classroom.building = space.floor.building.name if space.floor and space.floor.building else space.classroom.building


def seed_inventory(db: Session) -> None:
    """Create L Block / 2nd floor inventory once. Safe to call on every startup."""
    if db.query(Building).count() > 0:
        return

    building = Building(code="L", name="L Block")
    db.add(building)
    db.flush()
    floor = Floor(building_id=building.id, level=2, name="2nd Floor", is_pilot=True, map_width=24, map_height=10,
                  notes="Pilot floor. Layout is approximate; adjust in Floor Maps.")
    db.add(floor)
    db.flush()

    for s in FLOOR2_SPACES:
        x, y, w, h = s["rect"]
        classroom = db.query(Classroom).filter(Classroom.name == s["code"]).first() if s["kind"] == "CLASSROOM" else None
        space = Space(floor_id=floor.id, code=s["code"], name=s["name"], kind=s["kind"], capacity=s["capacity"],
                      bookable=s["bookable"], classroom_id=classroom.id if classroom else None,
                      map_x=x, map_y=y, map_w=w, map_h=h)
        db.add(space)
        db.flush()
        for a in s["assets"]:
            db.add(make_asset(space.id, a["device_type"], a["quantity"]))
        db.flush()
        db.refresh(space)
        sync_classroom_from_space(space)

    db.commit()
