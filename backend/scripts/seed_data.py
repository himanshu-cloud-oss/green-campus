"""Idempotent seed data script for Green Campus AI (Manav Rachna University)."""
import os
import sys
from datetime import time, date, datetime, timezone, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from app.database import SessionLocal, init_db, engine
from app.models.models import (
    Classroom,
    TimetableEntry,
    MonthlyEnergyRecord,
    DailyEnergyReading,
    DeviceState,
    Setting,
    Alert,
)

# -----------------------------------------------------------------------------
# 1. Classrooms
# -----------------------------------------------------------------------------
CLASSROOMS_DATA = [
    {"name": "LS-03", "building": "Block L", "floor": 1, "capacity": 60, "connected_load_kw": 2.4},
    {"name": "LS-04", "building": "Block L", "floor": 1, "capacity": 60, "connected_load_kw": 2.4},
    {"name": "LS-08", "building": "Block L", "floor": 2, "capacity": 60, "connected_load_kw": 2.4},
    {"name": "LS-09", "building": "Block L", "floor": 2, "capacity": 60, "connected_load_kw": 2.4},
    {"name": "LS-10", "building": "Block L", "floor": 3, "capacity": 60, "connected_load_kw": 2.4},
]

# -----------------------------------------------------------------------------
# 2. Historical Monthly Energy Data (EXACT VALUES)
# -----------------------------------------------------------------------------
MONTHLY_DATA = [
    {"month": 7,  "year": 2024, "grid": 131280.0, "generator": 18816.0, "solar": 7185.0,  "total": 157281.0, "notes": "Monsoon semester start; high humidity cooling loads."},
    {"month": 8,  "year": 2024, "grid": 139960.0, "generator": 10396.0, "solar": 7045.0,  "total": 157401.0, "notes": "Peak academic intake and full campus occupancy."},
    {"month": 9,  "year": 2024, "grid": 133060.0, "generator": 6657.0,  "solar": 6710.0,  "total": 146427.0, "notes": "Mid-term examination cycle."},
    {"month": 10, "year": 2024, "grid": 113860.0, "generator": 1570.0,  "solar": 8061.0,  "total": 123491.0, "notes": "Autumn transition; moderate outdoor ambient temperature."},
    {"month": 11, "year": 2024, "grid": 39780.0,  "generator": 2221.0,  "solar": 5662.0,  "total": 47663.0,  "notes": "Winter onset; HVAC chiller circuits deactivated."},
    {"month": 12, "year": 2024, "grid": 40080.0,  "generator": 0.0,     "solar": 5974.0,  "total": 46054.0,  "notes": "End-semester break; zero generator run hours."},
    {"month": 1,  "year": 2025, "grid": 40000.0,  "generator": 203.0,   "solar": 6260.0,  "total": 46463.0,  "notes": "Spring semester commencement; winter load profile."},
    {"month": 2,  "year": 2025, "grid": 39340.0,  "generator": 176.0,   "solar": 6357.0,  "total": 45873.0,  "notes": "Annual minimum baseline consumption month."},
    {"month": 3,  "year": 2025, "grid": 48420.0,  "generator": 182.0,   "solar": 10343.0, "total": 58945.0,  "notes": "Solar generation records highest yield (+10.3k kWh)."},
    {"month": 4,  "year": 2025, "grid": 147600.0, "generator": 6238.0,  "solar": 9433.0,  "total": 163271.0, "notes": "Summer surge begins; dual chiller plants activated."},
    {"month": 5,  "year": 2025, "grid": 126020.0, "generator": 4885.0,  "solar": 8942.0,  "total": 139847.0, "notes": "Extreme heatwave conditions; pre-cooling protocols active."},
    {"month": 6,  "year": 2025, "grid": 209100.0, "generator": 4007.0,  "solar": 7596.0,  "total": 220703.0, "notes": "Historical campus annual peak (>220k kWh); summer term & workshops."},
]

# -----------------------------------------------------------------------------
# 3. Default Settings
# -----------------------------------------------------------------------------
DEFAULT_SETTINGS = [
    {"key": "tariff_per_kwh", "value": "8.50", "description": "Electricity tariff in INR per kWh"},
    {"key": "grid_emission_factor", "value": "0.82", "description": "Grid CO2 emission factor in kg CO2 per kWh"},
    {"key": "classroom_load_kw", "value": "2.4", "description": "Assumed combined classroom load in kW"},
    {"key": "ac_load_kw", "value": "1.5", "description": "AC unit load in kW"},
    {"key": "fan_load_kw", "value": "0.075", "description": "Fan load in kW (2 fans)"},
    {"key": "lights_load_kw", "value": "0.2", "description": "Lighting load in kW"},
    {"key": "demo_mode", "value": "true", "description": "Demo mode enabled"},
    {"key": "no_show_countdown_seconds", "value": "180", "description": "No-show simulation countdown in seconds"},
]

# -----------------------------------------------------------------------------
# 4. Standard Period Intervals
# -----------------------------------------------------------------------------
PERIOD_TIMES = {
    "1": (time(8, 10), time(9, 0)),
    "2": (time(9, 0), time(9, 50)),
    "3": (time(9, 50), time(10, 40)),
    "4": (time(10, 40), time(11, 30)),
    "LUNCH": (time(11, 30), time(12, 20)),
    "6": (time(12, 20), time(13, 10)),
    "7": (time(13, 10), time(14, 0)),
    "8": (time(14, 0), time(14, 50)),
    "9": (time(14, 50), time(15, 40)),
    "10": (time(15, 40), time(16, 30)),
}


def seed_database_if_empty(db: Session = None):
    """
    Idempotent seeding function:
    Populates classrooms, devices, timetable entries, historical energy data,
    daily meter readings, and operational system settings if not already present.
    """
    close_db = False
    if db is None:
        init_db()
        db = SessionLocal()
        close_db = True

    try:
        # --- 1. Classrooms & Device States ---
        classroom_map = {}
        for c_data in CLASSROOMS_DATA:
            existing = db.query(Classroom).filter(Classroom.name == c_data["name"]).first()
            if not existing:
                room = Classroom(**c_data)
                db.add(room)
                db.flush()
                # Create initial device state
                d_state = DeviceState(
                    classroom_id=room.id,
                    ac_on=False,
                    fan_on=False,
                    lights_on=False,
                    source="TIMETABLE",
                    updated_at=datetime.now(timezone.utc),
                )
                db.add(d_state)
                classroom_map[c_data["name"]] = room
            else:
                classroom_map[c_data["name"]] = existing
                # Ensure device state exists
                if not existing.device_state:
                    d_state = DeviceState(
                        classroom_id=existing.id,
                        ac_on=False,
                        fan_on=False,
                        lights_on=False,
                        source="TIMETABLE",
                        updated_at=datetime.now(timezone.utc),
                    )
                    db.add(d_state)

        db.commit()

        # --- 2. Monthly Historical Energy Data ---
        count_monthly = db.query(MonthlyEnergyRecord).count()
        if count_monthly == 0:
            for rec in MONTHLY_DATA:
                db_record = MonthlyEnergyRecord(
                    month=rec["month"],
                    year=rec["year"],
                    grid_kwh=rec["grid"],
                    generator_kwh=rec["generator"],
                    solar_kwh=rec["solar"],
                    total_kwh=rec["total"],
                    notes=rec["notes"],
                    data_source="MRU Main Meter Substation",
                )
                db.add(db_record)
            db.commit()

        # --- 3. Operational Settings ---
        for s_data in DEFAULT_SETTINGS:
            existing_s = db.query(Setting).filter(Setting.key == s_data["key"]).first()
            if not existing_s:
                s = Setting(
                    key=s_data["key"],
                    value=s_data["value"],
                    description=s_data["description"],
                    updated_at=datetime.now(timezone.utc),
                )
                db.add(s)
        db.commit()

        # --- 4. Timetable Entries ---
        count_tt = db.query(TimetableEntry).count()
        if count_tt == 0:
            # Curriculum catalog
            subjects = [
                ("Data Structures", "Dr. Sharma", "CSE-A"),
                ("Algorithms", "Dr. Gupta", "CSE-B"),
                ("Digital Electronics", "Prof. Singh", "ECE-A"),
                ("Thermodynamics", "Dr. Verma", "ME-A"),
                ("Engineering Mathematics", "Prof. Kapoor", "CSE-A"),
                ("Machine Learning", "Dr. Mehta", "CSE-B"),
                ("Computer Networks", "Prof. Joshi", "CSE-A"),
                ("DBMS", "Dr. Yadav", "CSE-B"),
                ("Operating Systems", "Dr. Sharma", "CSE-A"),
                ("Control Systems", "Prof. Singh", "ECE-A"),
            ]

            days = ["MON", "TUE", "WED", "THU", "FRI"]
            all_rooms = db.query(Classroom).order_by(Classroom.id).all()

            # Schedule realistic engineering timetable
            # Note: leave some periods vacant (e.g. Period 4 in LS-08/LS-10, Period 9 in LS-03)
            # to make simulations and occupancy analytics meaningful.
            subject_idx = 0
            for room in all_rooms:
                for d_idx, day in enumerate(days):
                    # Active periods for this room on this day
                    # LS-03: vacant on periods 4 and 9
                    # LS-04: vacant on periods 8 and 10
                    # LS-08: vacant on periods 1 and 4
                    # LS-09: vacant on periods 6 and 9
                    # LS-10: vacant on periods 2, 4, 8
                    active_periods = ["1", "2", "3", "4", "6", "7", "8", "9", "10"]
                    if room.name == "LS-03":
                        active_periods = ["1", "2", "3", "6", "7", "8", "10"]  # 4 & 9 vacant
                    elif room.name == "LS-04":
                        active_periods = ["1", "2", "3", "4", "6", "7", "9"]   # 8 & 10 vacant
                    elif room.name == "LS-08":
                        active_periods = ["2", "3", "6", "7", "8", "9", "10"]  # 1 & 4 vacant
                    elif room.name == "LS-09":
                        active_periods = ["1", "2", "3", "4", "7", "8", "10"]  # 6 & 9 vacant
                    elif room.name == "LS-10":
                        active_periods = ["1", "3", "6", "7", "9", "10"]       # 2, 4, 8 vacant

                    for p_num in active_periods:
                        start_t, end_t = PERIOD_TIMES[p_num]
                        subj, teacher, sec = subjects[subject_idx % len(subjects)]
                        subject_idx += 1

                        tt_entry = TimetableEntry(
                            classroom_id=room.id,
                            day_of_week=day,
                            period_number=p_num,
                            start_time=start_t,
                            end_time=end_t,
                            subject=subj,
                            teacher=teacher,
                            section=sec,
                            demo_data=True,
                        )
                        db.add(tt_entry)

            db.commit()

        # --- 5. Sample Daily Energy Readings (June 2025) ---
        count_daily = db.query(DailyEnergyReading).count()
        if count_daily == 0:
            # Generate campus-level daily readings for June 2025 (30 days)
            # Total June: Grid ~209,100, Generator ~4,007, Solar ~7,596
            start_d = date(2025, 6, 1)
            for day_offset in range(30):
                curr_date = start_d + timedelta(days=day_offset)
                # Baseline daily averages
                grid_daily = round(209100.0 / 30.0 + (day_offset % 5 - 2) * 150.0, 2)
                gen_daily = round(4007.0 / 30.0 + (day_offset % 3 - 1) * 30.0, 2)
                solar_daily = round(7596.0 / 30.0 + (day_offset % 7 - 3) * 25.0, 2)

                db.add(DailyEnergyReading(
                    date=curr_date,
                    classroom_id=None,  # Campus level
                    source_type="GRID",
                    value_kwh=grid_daily,
                ))
                db.add(DailyEnergyReading(
                    date=curr_date,
                    classroom_id=None,
                    source_type="GENERATOR",
                    value_kwh=gen_daily,
                ))
                db.add(DailyEnergyReading(
                    date=curr_date,
                    classroom_id=None,
                    source_type="SOLAR",
                    value_kwh=solar_daily,
                ))
            db.commit()

        # --- 6. Initial System Alert ---
        count_alerts = db.query(Alert).count()
        if count_alerts == 0:
            first_room = db.query(Classroom).filter(Classroom.name == "LS-03").first()
            room_id = first_room.id if first_room else None
            init_alert = Alert(
                classroom_id=room_id,
                severity="WARNING",
                title="Historical Summer Peak Anomaly Detected",
                message=(
                    "Campus consumption peaked at 220,703 kWh in June 2025 (+1.8σ surge). "
                    "Recommend enabling automated BMS shutdown for empty classrooms during Periods 4 and 9."
                ),
                alert_type="ENERGY_SPIKE",
                created_at=datetime.now(timezone.utc),
            )
            db.add(init_alert)
            db.commit()

    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    print("Seeding Green Campus AI database...")
    seed_database_if_empty()
    print("Database seeding completed successfully.")
