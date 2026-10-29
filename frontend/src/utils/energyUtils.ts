import { MonthlyEnergyRecord, EnergySummary, SavingsEstimate } from '../types';

export const HISTORICAL_ENERGY_DATA: MonthlyEnergyRecord[] = [
  { id: 1, month: 7, year: 2024, month_label: 'Jul 2024', grid_kwh: 131280, generator_kwh: 18816, solar_kwh: 7185, total_kwh: 157281, mom_change_pct: 0 },
  { id: 2, month: 8, year: 2024, month_label: 'Aug 2024', grid_kwh: 139960, generator_kwh: 10396, solar_kwh: 7045, total_kwh: 157401, mom_change_pct: 0.08 },
  { id: 3, month: 9, year: 2024, month_label: 'Sep 2024', grid_kwh: 133060, generator_kwh: 6657, solar_kwh: 6710, total_kwh: 146427, mom_change_pct: -6.97 },
  { id: 4, month: 10, year: 2024, month_label: 'Oct 2024', grid_kwh: 113860, generator_kwh: 1570, solar_kwh: 8061, total_kwh: 123491, mom_change_pct: -15.66 },
  { id: 5, month: 11, year: 2024, month_label: 'Nov 2024', grid_kwh: 39780, generator_kwh: 2221, solar_kwh: 5662, total_kwh: 47663, mom_change_pct: -61.40 },
  { id: 6, month: 12, year: 2024, month_label: 'Dec 2024', grid_kwh: 40080, generator_kwh: 0, solar_kwh: 5974, total_kwh: 46054, mom_change_pct: -3.38 },
  { id: 7, month: 1, year: 2025, month_label: 'Jan 2025', grid_kwh: 40000, generator_kwh: 203, solar_kwh: 6260, total_kwh: 46463, mom_change_pct: 0.89 },
  { id: 8, month: 2, year: 2025, month_label: 'Feb 2025', grid_kwh: 39340, generator_kwh: 176, solar_kwh: 6357, total_kwh: 45873, mom_change_pct: -1.27 },
  { id: 9, month: 3, year: 2025, month_label: 'Mar 2025', grid_kwh: 48420, generator_kwh: 182, solar_kwh: 10343, total_kwh: 58945, mom_change_pct: 28.50 },
  { id: 10, month: 4, year: 2025, month_label: 'Apr 2025', grid_kwh: 147600, generator_kwh: 6238, solar_kwh: 9433, total_kwh: 163271, mom_change_pct: 176.99 },
  { id: 11, month: 5, year: 2025, month_label: 'May 2025', grid_kwh: 126020, generator_kwh: 4885, solar_kwh: 8942, total_kwh: 139847, mom_change_pct: -14.35 },
  { id: 12, month: 6, year: 2025, month_label: 'Jun 2025', grid_kwh: 209100, generator_kwh: 4007, solar_kwh: 7596, total_kwh: 220703, mom_change_pct: 57.82 },
];

export function computeEnergySummary(records: MonthlyEnergyRecord[] = HISTORICAL_ENERGY_DATA): EnergySummary {
  if (!records.length) {
    throw new Error('No energy records provided');
  }

  let total_grid = 0;
  let total_generator = 0;
  let total_solar = 0;
  let total_all = 0;

  let peak = records[0];
  let lowest = records[0];
  const issues: string[] = [];

  records.forEach((rec, idx) => {
    total_grid += rec.grid_kwh;
    total_generator += rec.generator_kwh;
    total_solar += rec.solar_kwh;
    total_all += rec.total_kwh;

    if (rec.total_kwh > peak.total_kwh) peak = rec;
    if (rec.total_kwh < lowest.total_kwh) lowest = rec;

    // Quality check: check if sum matches total within 1 kWh tolerance
    const sum = rec.grid_kwh + rec.generator_kwh + rec.solar_kwh;
    if (Math.abs(sum - rec.total_kwh) > 1) {
      issues.push(`Discrepancy in ${rec.month_label}: Grid+Gen+Solar (${sum.toLocaleString()} kWh) ≠ Total (${rec.total_kwh.toLocaleString()} kWh)`);
    }

    // Compute MoM change pct if not already provided
    if (idx > 0 && rec.mom_change_pct === undefined) {
      const prevTotal = records[idx - 1].total_kwh;
      rec.mom_change_pct = prevTotal ? Number((((rec.total_kwh - prevTotal) / prevTotal) * 100).toFixed(2)) : 0;
    }
  });

  return {
    peak_month: peak,
    lowest_month: lowest,
    total_grid,
    total_generator,
    total_solar,
    total_all,
    avg_monthly: Math.round(total_all / records.length),
    data_quality_ok: issues.length === 0,
    quality_issues: issues,
  };
}

export interface SavingsCalcInput {
  classroomsCount: number;
  hoursAvoided: number;
  daysPerWeek: number;
  tariffInr?: number;
  loadKw?: number;
  emissionFactor?: number;
}

export function calculateSavings({
  classroomsCount,
  hoursAvoided,
  daysPerWeek,
  tariffInr = 8.5,
  loadKw = 4.5,
  emissionFactor = 0.82,
}: SavingsCalcInput): SavingsEstimate {
  const dailyKwh = classroomsCount * hoursAvoided * loadKw;
  const dailyInr = dailyKwh * tariffInr;
  const dailyCo2 = dailyKwh * emissionFactor;

  const weeklyKwh = dailyKwh * daysPerWeek;
  const weeklyInr = dailyInr * daysPerWeek;

  const monthlyKwh = weeklyKwh * 4.33; // Average weeks per month
  const monthlyInr = weeklyInr * 4.33;

  return {
    energy_saved_kwh: Math.round(dailyKwh * 10) / 10,
    cost_saved_inr: Math.round(dailyInr * 100) / 100,
    co2_avoided_kg: Math.round(dailyCo2 * 10) / 10,
    classrooms_count: classroomsCount,
    hours_avoided: hoursAvoided,
    tariff_used: tariffInr,
    load_kw_used: loadKw,
    emission_factor_used: emissionFactor,
    weekly_energy_kwh: Math.round(weeklyKwh * 10) / 10,
    monthly_energy_kwh: Math.round(monthlyKwh * 10) / 10,
    weekly_cost_inr: Math.round(weeklyInr * 100) / 100,
    monthly_cost_inr: Math.round(monthlyInr * 100) / 100,
    assumptions: [
      `Average classroom connected load: ${loadKw} kW (AC 3.5kW + Fans 0.4kW + Lights 0.6kW)`,
      `Commercial grid tariff: ₹${tariffInr}/kWh (Haryana state electricity board)`,
      `Grid carbon emission intensity factor: ${emissionFactor} kg CO₂/kWh (CEA India benchmark)`,
      `Monthly projection calculated using 4.33 weeks per month`,
    ],
  };
}

export function exportToCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(fieldName => {
          const val = row[fieldName];
          if (val === null || val === undefined) return '""';
          const stringVal = String(val).replace(/"/g, '""');
          return `"${stringVal}"`;
        })
        .join(',')
    ),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
