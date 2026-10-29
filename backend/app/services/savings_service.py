"""Energy conservation, monetary savings, and CO2 emission abatement calculations."""
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.models import SavingsRun
from app.config import settings


# Standard conversion factors
# EPA / CEA India: ~0.82 kg CO2 / kWh from Indian Northern Regional Grid
# 1 mature urban tree absorbs approximately 21.77 kg of CO2 per year
DEFAULT_TREE_ABSORPTION_KG_YEAR = 21.77


def estimate_savings(
    classroom_ids: List[int],
    hours_avoided: float,
    days: int = 1,
    tariff_per_kwh: Optional[float] = None,
    load_kw: Optional[float] = None,
    emission_factor: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Calculate estimated energy, financial, and CO2 savings for avoided runtime.
    Deduplicates classroom IDs to prevent double-counting.
    """
    tariff = tariff_per_kwh if tariff_per_kwh is not None else settings.DEFAULT_TARIFF_PER_KWH
    load = load_kw if load_kw is not None else settings.DEFAULT_CLASSROOM_LOAD_KW
    emissions = emission_factor if emission_factor is not None else settings.DEFAULT_GRID_EMISSION_FACTOR

    # Deduplicate classrooms to prevent double-counting
    unique_classrooms = sorted(list(set(classroom_ids)))
    room_count = len(unique_classrooms)

    # Formula: Rooms * Hours * Days * Load (kW)
    total_hours = max(0.0, hours_avoided) * max(1, days)
    energy_saved_kwh = round(room_count * total_hours * load, 3)
    cost_saved_inr = round(energy_saved_kwh * tariff, 2)
    co2_avoided_kg = round(energy_saved_kwh * emissions, 3)
    trees_equivalent = round(co2_avoided_kg / DEFAULT_TREE_ABSORPTION_KG_YEAR, 2)

    return {
        "classroom_ids": unique_classrooms,
        "classroom_count": room_count,
        "hours_avoided": hours_avoided,
        "days": days,
        "load_kw": load,
        "tariff_per_kwh": tariff,
        "emission_factor_kg": emissions,
        "energy_saved_kwh": energy_saved_kwh,
        "cost_saved_inr": cost_saved_inr,
        "co2_avoided_kg": co2_avoided_kg,
        "trees_equivalent": trees_equivalent,
    }


def calculate_whatif(
    classroom_count: int = 5,
    tariff_per_kwh: Optional[float] = None,
    emission_factor: Optional[float] = None,
    load_kw: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Produce what-if scenarios comparing various campus-wide energy conservation initiatives.
    """
    tariff = tariff_per_kwh if tariff_per_kwh is not None else settings.DEFAULT_TARIFF_PER_KWH
    emissions = emission_factor if emission_factor is not None else settings.DEFAULT_GRID_EMISSION_FACTOR
    load = load_kw if load_kw is not None else settings.DEFAULT_CLASSROOM_LOAD_KW

    presets = [
        {
            "scenario_name": "Lunch Break Eco-Mode",
            "description": "Automatically powering down cooling and lights during the 50-minute campus lunch hour.",
            "rooms": classroom_count,
            "hours_per_day": 50.0 / 60.0,  # ~0.833 hr
            "days_per_year": 220,
        },
        {
            "scenario_name": "No-Show Zero-Waste Automation",
            "description": "Turning off empty rooms after 3-minute grace periods for unheld/cancelled classes (avg 1 hr/day).",
            "rooms": classroom_count,
            "hours_per_day": 1.0,
            "days_per_year": 220,
        },
        {
            "scenario_name": "Post-Lecture Staggered Shutdown",
            "description": "Automated shutdown after Period 10 (16:30) preventing evening phantom loads (1.5 hrs/day).",
            "rooms": classroom_count,
            "hours_per_day": 1.5,
            "days_per_year": 240,
        },
        {
            "scenario_name": "Comprehensive Smart Campus Master Policy",
            "description": "Full automated BMS orchestration: lunch eco-mode + no-show cutoffs + phantom load elimination (2.5 hrs/day).",
            "rooms": classroom_count,
            "hours_per_day": 2.5,
            "days_per_year": 240,
        },
    ]

    scenarios = []
    for p in presets:
        kwh_saved = round(p["rooms"] * p["hours_per_day"] * p["days_per_year"] * load, 2)
        cost_saved = round(kwh_saved * tariff, 2)
        co2_saved = round(kwh_saved * emissions, 2)
        trees = round(co2_saved / DEFAULT_TREE_ABSORPTION_KG_YEAR, 2)

        scenarios.append({
            "scenario_name": p["scenario_name"],
            "description": p["description"],
            "num_classrooms": p["rooms"],
            "hours_per_day": round(p["hours_per_day"], 2),
            "days_per_year": p["days_per_year"],
            "annual_kwh_saved": kwh_saved,
            "annual_cost_saved_inr": cost_saved,
            "annual_co2_avoided_kg": co2_saved,
            "equivalent_trees_planted": trees,
        })

    return {
        "tariff_per_kwh": tariff,
        "emission_factor": emissions,
        "default_classroom_load_kw": load,
        "active_classroom_count": classroom_count,
        "scenarios": scenarios,
    }


def record_savings_run(
    classroom_ids: List[int],
    hours_avoided: float,
    days: int,
    calculation_type: str,
    db: Session,
    tariff_per_kwh: Optional[float] = None,
    load_kw: Optional[float] = None,
) -> SavingsRun:
    """Save an executed savings calculation into the database."""
    calc = estimate_savings(
        classroom_ids=classroom_ids,
        hours_avoided=hours_avoided,
        days=days,
        tariff_per_kwh=tariff_per_kwh,
        load_kw=load_kw,
    )

    run = SavingsRun(
        run_at=datetime.now(timezone.utc),
        classrooms_selected=",".join(str(cid) for cid in calc["classroom_ids"]),
        hours_avoided=hours_avoided * days,
        tariff_per_kwh=calc["tariff_per_kwh"],
        load_kw=calc["load_kw"],
        energy_saved_kwh=calc["energy_saved_kwh"],
        cost_saved=calc["cost_saved_inr"],
        co2_avoided_kg=calc["co2_avoided_kg"],
        calculation_type=calculation_type.upper(),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run
