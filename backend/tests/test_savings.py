"""Unit and integration tests for energy savings, emissions avoided, and what-if scenarios."""
import pytest
from app.services.savings_service import estimate_savings, calculate_whatif


def test_savings_formula_accuracy():
    """
    Test energy savings formula:
    Energy Saved (kWh) = Rooms * Hours * Days * Load (kW)
    Cost Saved = kWh * Tariff
    CO2 Avoided = kWh * Emission Factor
    """
    # 2 classrooms, 3 hours, 5 days, load 2.4 kW, tariff 8.50, emission 0.82
    # kWh = 2 * 3 * 5 * 2.4 = 72.0 kWh
    # Cost = 72.0 * 8.50 = 612.0 INR
    # CO2 = 72.0 * 0.82 = 59.04 kg CO2
    res = estimate_savings(
        classroom_ids=[1, 2],
        hours_avoided=3.0,
        days=5,
        tariff_per_kwh=8.50,
        load_kw=2.4,
        emission_factor=0.82,
    )

    assert res["classroom_count"] == 2
    assert res["energy_saved_kwh"] == 72.0
    assert res["cost_saved_inr"] == 612.0
    assert res["co2_avoided_kg"] == 59.04
    assert res["trees_equivalent"] > 0


def test_no_double_counting_duplicates():
    """Verify that redundant classroom IDs in the request are deduplicated."""
    # Pass duplicate IDs: [1, 1, 2, 2, 2, 3] -> should count as 3 classrooms
    res = estimate_savings(
        classroom_ids=[1, 1, 2, 2, 2, 3],
        hours_avoided=1.0,
        days=1,
        tariff_per_kwh=8.50,
        load_kw=2.4,
        emission_factor=0.82,
    )

    assert res["classroom_count"] == 3
    assert res["classroom_ids"] == [1, 2, 3]
    # kWh = 3 * 1 * 1 * 2.4 = 7.2 kWh
    assert res["energy_saved_kwh"] == 7.2


def test_whatif_analysis_structure():
    """Verify what-if analysis generates expected campus policy presets."""
    whatif = calculate_whatif(classroom_count=5)

    assert whatif["active_classroom_count"] == 5
    assert len(whatif["scenarios"]) >= 4

    preset_names = [s["scenario_name"] for s in whatif["scenarios"]]
    assert "Lunch Break Eco-Mode" in preset_names
    assert "No-Show Zero-Waste Automation" in preset_names

    for s in whatif["scenarios"]:
        assert s["annual_kwh_saved"] > 0
        assert s["annual_cost_saved_inr"] > 0
        assert s["annual_co2_avoided_kg"] > 0
        assert s["equivalent_trees_planted"] > 0


def test_savings_api_endpoints(client):
    """Test HTTP endpoints for estimate, calculation persist, history, and what-if."""
    # GET /api/savings/estimate
    r_est = client.get("/api/savings/estimate?classroom_ids=1,2&hours=2&days=5")
    assert r_est.status_code == 200
    data = r_est.json()
    assert data["classroom_count"] == 2
    assert data["energy_saved_kwh"] > 0

    # POST /api/savings/calculate
    payload = {
        "classroom_ids": [1, 2, 3],
        "hours_avoided": 2.5,
        "days": 4,
        "calculation_type": "ESTIMATED",
    }
    r_calc = client.post("/api/savings/calculate", json=payload)
    assert r_calc.status_code == 201
    calc_data = r_calc.json()
    assert calc_data["calculation_type"] == "ESTIMATED"

    # GET /api/savings/history
    r_hist = client.get("/api/savings/history")
    assert r_hist.status_code == 200
    assert len(r_hist.json()) >= 1

    # GET /api/savings/whatif
    r_whatif = client.get("/api/savings/whatif")
    assert r_whatif.status_code == 200
    assert "scenarios" in r_whatif.json()
