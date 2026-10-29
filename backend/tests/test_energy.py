"""Unit and integration tests for energy analytics and data reconciliation."""
import pytest
from app.models.models import MonthlyEnergyRecord
from app.services.energy_service import (
    calculate_mom_changes,
    validate_data_quality,
    get_energy_summary,
    generate_csv,
)


def test_monthly_data_seeded(db):
    """Verify that all 12 historical monthly records are seeded accurately."""
    records = db.query(MonthlyEnergyRecord).all()
    assert len(records) == 12

    # Check June 2025 peak values
    jun2025 = (
        db.query(MonthlyEnergyRecord)
        .filter(MonthlyEnergyRecord.year == 2025, MonthlyEnergyRecord.month == 6)
        .first()
    )
    assert jun2025 is not None
    assert jun2025.grid_kwh == 209100.0
    assert jun2025.generator_kwh == 4007.0
    assert jun2025.solar_kwh == 7596.0
    assert jun2025.total_kwh == 220703.0


def test_energy_reconciliation_exact_sum(db):
    """Verify grid + generator + solar == total_kwh for all historical months."""
    records = db.query(MonthlyEnergyRecord).all()
    validation = validate_data_quality(records)

    assert validation["is_valid"] is True
    assert validation["discrepancy_count"] == 0
    assert validation["valid_records"] == 12


def test_mom_changes_calculation(db):
    """Test month-over-month kWh and percentage variance calculations."""
    records = db.query(MonthlyEnergyRecord).all()
    mom = calculate_mom_changes(records)

    assert len(mom) == 12
    # First month (Jul 2024) has no prior month
    assert mom[0]["change_kwh"] is None

    # Check August 2024 (157401 - 157281 = +120 kWh)
    assert mom[1]["month"] == 8
    assert mom[1]["year"] == 2024
    assert mom[1]["change_kwh"] == 120.0
    assert mom[1]["change_percentage"] is not None
    assert mom[1]["change_percentage"] > 0


def test_energy_summary_metrics(db):
    """Verify campus energy summary metrics, peak and lowest detection."""
    records = db.query(MonthlyEnergyRecord).all()
    summary = get_energy_summary(records)

    assert summary["total_records"] == 12
    assert summary["peak_month"]["month"] == 6
    assert summary["peak_month"]["year"] == 2025
    assert summary["peak_month"]["total_kwh"] == 220703.0

    assert summary["lowest_month"]["month"] == 2
    assert summary["lowest_month"]["year"] == 2025
    assert summary["lowest_month"]["total_kwh"] == 45873.0

    assert summary["solar_share_percentage"] > 0
    assert summary["annual_total_kwh"] > 1000000


def test_csv_export_format(db):
    """Test that CSV generator returns valid headers and rows."""
    records = db.query(MonthlyEnergyRecord).all()
    csv_text = generate_csv(records)

    lines = [line.strip() for line in csv_text.strip().split("\n") if line.strip()]
    assert len(lines) == 13  # 1 header + 12 data rows
    assert "Year,Month,Period,Grid_kWh,Generator_kWh,Solar_kWh,Total_kWh" in lines[0]
    assert "2025,6,Jun 2025,209100.00,4007.00,7596.00,220703.00" in lines[-1]


def test_energy_api_endpoints(client):
    """Test API endpoints for monthly records, summary, validation, and CSV download."""
    # GET /api/energy/monthly
    r = client.get("/api/energy/monthly")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 12
    assert data[0]["reconciled"] is True

    # GET /api/energy/monthly with year filter
    r_2025 = client.get("/api/energy/monthly?year=2025")
    assert r_2025.status_code == 200
    assert len(r_2025.json()) == 6

    # GET /api/energy/summary
    r_sum = client.get("/api/energy/summary")
    assert r_sum.status_code == 200
    sum_data = r_sum.json()
    assert sum_data["peak_month"]["total_kwh"] == 220703.0

    # POST /api/energy/validate
    r_val = client.post("/api/energy/validate")
    assert r_val.status_code == 200
    assert r_val.json()["is_valid"] is True

    # GET /api/energy/export
    r_exp = client.get("/api/energy/export")
    assert r_exp.status_code == 200
    assert "text/csv" in r_exp.headers["content-type"]
    assert "Grid_kWh" in r_exp.text
