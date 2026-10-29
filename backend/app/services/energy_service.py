"""Campus energy calculations, reconciliation validation, and report generation."""
import io
import csv
from typing import List, Dict, Any, Optional
from app.models.models import MonthlyEnergyRecord


def get_month_name(month: int) -> str:
    """Return 3-letter month abbreviation."""
    months = [
        "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]
    return months[month] if 1 <= month <= 12 else str(month)


def calculate_mom_changes(records: List[MonthlyEnergyRecord]) -> List[Dict[str, Any]]:
    """
    Calculate Month-over-Month (MoM) kWh variance and percentage changes
    for chronologically sorted monthly records.
    """
    sorted_records = sorted(records, key=lambda r: (r.year, r.month))
    results: List[Dict[str, Any]] = []

    prev_total: Optional[float] = None
    for r in sorted_records:
        period_label = f"{get_month_name(r.month)} {r.year}"
        if prev_total is None or prev_total == 0:
            change_kwh = None
            pct_change = None
        else:
            change_kwh = round(r.total_kwh - prev_total, 2)
            pct_change = round((change_kwh / prev_total) * 100.0, 2)

        results.append({
            "month": r.month,
            "year": r.year,
            "period_label": period_label,
            "total_kwh": r.total_kwh,
            "change_kwh": change_kwh,
            "change_percentage": pct_change,
        })
        prev_total = r.total_kwh

    return results


def validate_data_quality(records: List[MonthlyEnergyRecord]) -> Dict[str, Any]:
    """
    Verify that grid_kwh + generator_kwh + solar_kwh == total_kwh for each record.
    Returns discrepancy list and validation status.
    """
    discrepancies: List[Dict[str, Any]] = []
    tolerance = 1.0  # 1 kWh allowable float rounding tolerance

    for r in records:
        component_sum = r.grid_kwh + r.generator_kwh + r.solar_kwh
        diff = round(abs(component_sum - r.total_kwh), 2)
        if diff > tolerance:
            discrepancies.append({
                "record_id": r.id,
                "month": r.month,
                "year": r.year,
                "period": f"{get_month_name(r.month)} {r.year}",
                "grid_kwh": r.grid_kwh,
                "generator_kwh": r.generator_kwh,
                "solar_kwh": r.solar_kwh,
                "component_sum": round(component_sum, 2),
                "recorded_total": r.total_kwh,
                "discrepancy_kwh": round(component_sum - r.total_kwh, 2),
            })

    total = len(records)
    discrepancy_count = len(discrepancies)
    return {
        "total_records": total,
        "valid_records": total - discrepancy_count,
        "discrepancy_count": discrepancy_count,
        "is_valid": discrepancy_count == 0,
        "discrepancies": discrepancies,
    }


def get_energy_summary(records: List[MonthlyEnergyRecord]) -> Dict[str, Any]:
    """
    Compute comprehensive campus energy metrics:
    - Annual and aggregate totals (grid, generator, solar, total)
    - Peak and lowest consumption months
    - Solar generation penetration percentage
    - Chronological Month-over-Month changes
    """
    if not records:
        return {
            "total_records": 0,
            "annual_total_kwh": 0.0,
            "annual_grid_kwh": 0.0,
            "annual_generator_kwh": 0.0,
            "annual_solar_kwh": 0.0,
            "solar_share_percentage": 0.0,
            "average_monthly_kwh": 0.0,
            "peak_month": {},
            "lowest_month": {},
            "mom_changes": [],
        }

    total_kwh = sum(r.total_kwh for r in records)
    total_grid = sum(r.grid_kwh for r in records)
    total_generator = sum(r.generator_kwh for r in records)
    total_solar = sum(r.solar_kwh for r in records)

    solar_share = round((total_solar / total_kwh * 100.0), 2) if total_kwh > 0 else 0.0
    avg_monthly = round(total_kwh / len(records), 2)

    peak_record = max(records, key=lambda r: r.total_kwh)
    lowest_record = min(records, key=lambda r: r.total_kwh)

    mom = calculate_mom_changes(records)

    return {
        "total_records": len(records),
        "annual_total_kwh": round(total_kwh, 2),
        "annual_grid_kwh": round(total_grid, 2),
        "annual_generator_kwh": round(total_generator, 2),
        "annual_solar_kwh": round(total_solar, 2),
        "solar_share_percentage": solar_share,
        "average_monthly_kwh": avg_monthly,
        "peak_month": {
            "month": peak_record.month,
            "year": peak_record.year,
            "period_label": f"{get_month_name(peak_record.month)} {peak_record.year}",
            "total_kwh": peak_record.total_kwh,
            "grid_kwh": peak_record.grid_kwh,
            "solar_kwh": peak_record.solar_kwh,
        },
        "lowest_month": {
            "month": lowest_record.month,
            "year": lowest_record.year,
            "period_label": f"{get_month_name(lowest_record.month)} {lowest_record.year}",
            "total_kwh": lowest_record.total_kwh,
            "grid_kwh": lowest_record.grid_kwh,
            "solar_kwh": lowest_record.solar_kwh,
        },
        "mom_changes": mom,
    }


def generate_csv(records: List[MonthlyEnergyRecord]) -> str:
    """Generate a clean RFC-4180 compliant CSV string of monthly energy records."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Year",
        "Month",
        "Period",
        "Grid_kWh",
        "Generator_kWh",
        "Solar_kWh",
        "Total_kWh",
        "Data_Source",
        "Notes",
    ])

    sorted_records = sorted(records, key=lambda r: (r.year, r.month))
    for r in sorted_records:
        writer.writerow([
            r.year,
            r.month,
            f"{get_month_name(r.month)} {r.year}",
            f"{r.grid_kwh:.2f}",
            f"{r.generator_kwh:.2f}",
            f"{r.solar_kwh:.2f}",
            f"{r.total_kwh:.2f}",
            r.data_source,
            r.notes or "",
        ])

    return output.getvalue()
