"""Annual savings model for the pilot floor.

Baseline = how the floor runs today (people leave things on), modelled with the same
behaviour assumptions as live telemetry. Automated = controllable loads in the chosen
categories are switched off in empty rooms after a grace period. Energy is costed
using the real campus supply mix (grid / diesel / solar) for each calendar month.
"""
import calendar
from datetime import date, datetime, time, timedelta
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.models.models import MonthlyEnergyRecord
from app.services.telemetry_service import ASSUMPTIONS, FloorModel
from app.clock import today_local

TREE_KG_CO2_PER_YEAR = 21.77
STRATEGY_FOR_STATE = {"VACANT": "vacant_periods", "LUNCH": "lunch", "NO_SHOW": "no_show",
                      "AFTER_HOURS": "after_hours", "CLOSED": "after_hours"}


class SavingsModelRequest(BaseModel):
    # Scope
    space_ids: Optional[List[int]] = None
    categories: List[str] = ["HVAC", "FAN", "LIGHTING", "AV"]
    # Automation strategies
    vacant_periods: bool = True
    lunch: bool = True
    no_show: bool = True
    after_hours: bool = True
    grace_minutes: float = Field(3, ge=0, le=30)
    no_show_rate: float = Field(ASSUMPTIONS["no_show_rate"], ge=0, le=0.5)
    # Efficiency upgrades
    ac_setpoint_raise_c: float = Field(0, ge=0, le=4)
    ac_saving_per_degree: float = Field(0.06, ge=0, le=0.15)
    bldc_fan_retrofit: bool = False
    # Academic calendar: teaching days per month, Jan..Dec
    teaching_days: List[int] = Field(default_factory=lambda: [20, 20, 18, 22, 18, 16, 14, 22, 20, 18, 18, 10])
    # Tariff (commercial / NDS) - placeholders until copied from the DHBVN bill
    energy_charge_inr_kwh: float = Field(7.50, ge=0)
    surcharges_inr_kwh: float = Field(1.00, ge=0)
    use_real_supply_mix: bool = True
    diesel_inr_per_litre: float = Field(90.0, ge=0)
    dg_kwh_per_litre: float = Field(3.2, gt=0)
    # Emissions
    grid_emission_kg_kwh: float = Field(0.82, ge=0)
    diesel_kg_co2_per_litre: float = Field(2.68, ge=0)
    # Investment
    hardware_inr_per_room: float = Field(15000, ge=0)
    bldc_inr_per_fan: float = Field(3500, ge=0)


def _rep_day(year: int, month: int, weekday: int) -> date:
    d = date(year, month, 1)
    while d.weekday() != weekday:
        d += timedelta(days=1)
    return d


def run_model(db: Session, req: SavingsModelRequest) -> Dict[str, Any]:
    model = FloorModel(db)
    spaces = [s for s in model.spaces if not req.space_ids or s.id in req.space_ids]
    cats = set(req.categories)
    enabled = {k: getattr(req, k) for k in ("vacant_periods", "lunch", "no_show", "after_hours")}
    grace_h = req.grace_minutes / 60.0
    step = 30
    year = today_local().year

    mix = {r.month: r for r in db.query(MonthlyEnergyRecord).all()}
    tot = {"baseline": 0.0, "automated": 0.0}
    by_strategy = {k: 0.0 for k in ("vacant_periods", "lunch", "no_show", "after_hours", "ac_setpoint", "bldc_fans")}
    by_category: Dict[str, float] = {}
    by_space = {s.code: {"code": s.code, "kind": s.kind, "baseline_kwh": 0.0, "saved_kwh": 0.0} for s in spaces}
    months = []
    cost_saved_total = co2_total = 0.0

    def ctrl_assets(sp):
        return [a for a in sp.assets if a.controllable and a.category in cats]

    for m in range(1, 13):
        n_days = calendar.monthrange(year, m)[1]
        teach = min(req.teaching_days[m - 1] if m - 1 < len(req.teaching_days) else 0, n_days)
        closed_days = n_days - teach
        # Representative days: Mon-Fri teaching days share the teaching count; a Sunday stands in for closed days.
        day_weights = [(_rep_day(year, m, wd), teach / 5.0) for wd in range(5)] + [(_rep_day(year, m, 6), closed_days)]

        m_base = m_saved = 0.0
        m_strat = {k: 0.0 for k in by_strategy}
        for rep, weight in day_weights:
            if weight <= 0:
                continue
            t = datetime.combine(rep, time(0, 0)) + timedelta(minutes=step / 2)
            prev_state: Dict[int, str] = {}
            while t.date() == rep:
                h = step / 60.0
                for sp in spaces:
                    state = model.occupancy(sp, t)["state"]
                    if state == "NO_SHOW":
                        state = "OCCUPIED"
                    if state == "OCCUPIED" and sp.classroom_id:
                        occ_kw = model.expected_kw(sp, "OCCUPIED", t)
                        ns_kw = model.expected_kw(sp, "NO_SHOW", t)
                        base_kw = (1 - req.no_show_rate) * occ_kw + req.no_show_rate * ns_kw
                        waste = {"no_show": req.no_show_rate * _ctrl_kw(model, sp, "NO_SHOW", t, cats)}
                        occ_factor = 1 - req.no_show_rate
                    else:
                        base_kw = model.expected_kw(sp, state, t)
                        strat = STRATEGY_FOR_STATE.get(state)
                        waste = {strat: _ctrl_kw(model, sp, state, t, cats)} if strat else {}
                        occ_factor = 1.0 if state in ("OCCUPIED", "BOOKED", "OPEN") else 0.0

                    e_base = base_kw * h * weight
                    m_base += e_base
                    by_space[sp.code]["baseline_kwh"] += e_base
                    saved_here = 0.0
                    for strat, w_kw in waste.items():
                        if not enabled.get(strat) or w_kw <= 0:
                            continue
                        # Automation reacts after the grace period once per state change.
                        grace = grace_h if prev_state.get(sp.id) != state else 0.0
                        s_kwh = max(0.0, w_kw * (h - min(grace, h))) * weight
                        m_strat[strat] += s_kwh
                        saved_here += s_kwh
                        share_state = "NO_SHOW" if strat == "no_show" else state
                        share_total = _ctrl_kw(model, sp, share_state, t, cats)
                        for a in ctrl_assets(sp):
                            share = _asset_kw(model, a, share_state, t) / share_total if share_total else 0
                            by_category[a.category] = by_category.get(a.category, 0.0) + s_kwh * share

                    # Efficiency upgrades apply to occupied running hours.
                    if occ_factor > 0:
                        run_state = "OPEN" if state == "OPEN" else "OCCUPIED"
                        if req.ac_setpoint_raise_c > 0 and "HVAC" in cats:
                            hvac = _ctrl_kw(model, sp, run_state, t, {"HVAC"}) * occ_factor
                            s_kwh = hvac * min(0.5, req.ac_saving_per_degree * req.ac_setpoint_raise_c) * h * weight
                            m_strat["ac_setpoint"] += s_kwh
                            saved_here += s_kwh
                            by_category["HVAC"] = by_category.get("HVAC", 0.0) + s_kwh
                        if req.bldc_fan_retrofit:
                            fan = sum(_asset_kw(model, a, run_state, t) for a in sp.assets
                                      if a.device_type == "CEILING_FAN") * occ_factor
                            s_kwh = fan * (1 - 28 / 75) * h * weight
                            m_strat["bldc_fans"] += s_kwh
                            saved_here += s_kwh
                            by_category["FAN"] = by_category.get("FAN", 0.0) + s_kwh
                    by_space[sp.code]["saved_kwh"] += saved_here
                    m_saved += saved_here
                    prev_state[sp.id] = state
                t += timedelta(minutes=step)

        # Cost and CO2 using this month's real supply mix (solar output isn't reduced by saving).
        rec = mix.get(m)
        if req.use_real_supply_mix and rec and (rec.grid_kwh + rec.generator_kwh) > 0:
            dg_share = rec.generator_kwh / (rec.grid_kwh + rec.generator_kwh)
        else:
            dg_share = 0.0
        grid_rate = req.energy_charge_inr_kwh + req.surcharges_inr_kwh
        dg_rate = req.diesel_inr_per_litre / req.dg_kwh_per_litre
        dg_ef = req.diesel_kg_co2_per_litre / req.dg_kwh_per_litre
        cost = m_saved * ((1 - dg_share) * grid_rate + dg_share * dg_rate)
        co2 = m_saved * ((1 - dg_share) * req.grid_emission_kg_kwh + dg_share * dg_ef)
        cost_saved_total += cost
        co2_total += co2
        tot["baseline"] += m_base
        for k, v in m_strat.items():
            by_strategy[k] += v
        months.append({
            "month": calendar.month_abbr[m], "teaching_days": teach,
            "baseline_kwh": round(m_base, 1), "saved_kwh": round(m_saved, 1),
            "cost_saved_inr": round(cost, 0), "co2_saved_kg": round(co2, 1),
            "dg_share_pct": round(dg_share * 100, 1),
            "campus_bill_kwh": rec.total_kwh if rec else None,
        })

    saved = sum(by_strategy.values())
    n_rooms = sum(1 for s in spaces if ctrl_assets(s))
    n_fans = sum(a.quantity for s in spaces for a in s.assets if a.device_type == "CEILING_FAN")
    capex = n_rooms * req.hardware_inr_per_room + (n_fans * req.bldc_inr_per_fan if req.bldc_fan_retrofit else 0)
    return {
        "simulated": True,
        "scope": {"spaces": [s.code for s in spaces], "controlled_rooms": n_rooms, "categories": sorted(cats),
                  "ceiling_fans": n_fans},
        "annual": {
            "baseline_kwh": round(tot["baseline"], 0),
            "saved_kwh": round(saved, 0),
            "automated_kwh": round(tot["baseline"] - saved, 0),
            "saved_pct": round(saved / tot["baseline"] * 100, 1) if tot["baseline"] else 0,
            "cost_saved_inr": round(cost_saved_total, 0),
            "co2_saved_kg": round(co2_total, 0),
            "trees_equivalent": round(co2_total / TREE_KG_CO2_PER_YEAR, 0),
            "capex_inr": round(capex, 0),
            "payback_years": round(capex / cost_saved_total, 1) if cost_saved_total > 0 else None,
        },
        "by_strategy": {k: round(v, 0) for k, v in by_strategy.items()},
        "by_category": {k: round(v, 0) for k, v in sorted(by_category.items(), key=lambda kv: -kv[1])},
        "by_space": sorted(({**v, "baseline_kwh": round(v["baseline_kwh"], 0), "saved_kwh": round(v["saved_kwh"], 0)}
                            for v in by_space.values()), key=lambda r: -r["saved_kwh"]),
        "by_month": months,
    }


def _asset_kw(model: FloorModel, a: Any, state: str, t: datetime) -> float:
    from app.services.telemetry_service import outdoor_temp_c
    temp = outdoor_temp_c(t)
    p = model.p_on(a, state, temp)
    return a.quantity * p * a.rated_power_w * model.duty(a, temp) / 1000.0


def _ctrl_kw(model: FloorModel, sp: Any, state: str, t: datetime, cats: set) -> float:
    return sum(_asset_kw(model, a, state, t) for a in sp.assets if a.controllable and a.category in cats)
