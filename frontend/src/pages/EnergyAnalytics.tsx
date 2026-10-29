import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { EnergyStackedBar } from '../components/charts/EnergyStackedBar';
import { EnergyTrendLine } from '../components/charts/EnergyTrendLine';
import { SourceDistribution } from '../components/charts/SourceDistribution';
import { ExportButtons } from '../components/reports/ExportButtons';
import { useEnergy } from '../hooks/useEnergy';
import { formatNumberWithCommas, formatPercent } from '../utils/formatters';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Sun,
  ShieldAlert,
  Calendar,
  Layers,
  ArrowUp,
  ArrowDown,
  Info,
} from 'lucide-react';

export const EnergyAnalytics: React.FC = () => {
  const { records, summary } = useEnergy();
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('ALL');

  // Filtered dataset
  const displayedRecords =
    selectedPeriodFilter === '2024'
      ? records.filter(r => r.year === 2024)
      : selectedPeriodFilter === '2025'
      ? records.filter(r => r.year === 2025)
      : records;

  const solarPct = summary.total_all > 0 ? (summary.total_solar / summary.total_all) * 100 : 0;
  const gridPct = summary.total_all > 0 ? (summary.total_grid / summary.total_all) * 100 : 0;

  // CSV Export structure
  const exportData = records.map(r => ({
    Month: r.month_label,
    'Grid (kWh)': r.grid_kwh,
    'Generator (kWh)': r.generator_kwh,
    'Solar (kWh)': r.solar_kwh,
    'Total (kWh)': r.total_kwh,
    'MoM Change (%)': r.mom_change_pct ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Zap className="w-6 h-6 text-cyan-400" />
            <span>Campus Energy Analytics & Historical Telemetry</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete 12-month power consumption breakdown across Utility Grid, DG Backup, and Rooftop Solar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedPeriodFilter}
              onChange={e => setSelectedPeriodFilter(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none font-medium cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">
                Full Year (Jul 2024 - Jun 2025)
              </option>
              <option value="2024" className="bg-slate-900">
                FY 2024 Only (Jul - Dec)
              </option>
              <option value="2025" className="bg-slate-900">
                FY 2025 Only (Jan - Jun)
              </option>
            </select>
          </div>

          <ExportButtons
            data={exportData}
            filename="green_campus_energy_historical_12m"
            label="Download CSV"
          />
        </div>
      </div>

      {/* Data Quality Notice (if any issue) */}
      {!summary.data_quality_ok && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Meter Telemetry Integrity Check Warning:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-300">
              {summary.quality_issues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 5 KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Total Annual */}
        <Card glow="cyan" padding="sm" className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Total Consumption</span>
          <div className="text-xl font-bold font-mono text-white">
            {formatNumberWithCommas(summary.total_all)} <span className="text-xs font-normal text-slate-400">kWh</span>
          </div>
          <div className="text-[10px] text-cyan-400 font-mono">
            Avg: {formatNumberWithCommas(summary.avg_monthly)} kWh/mo
          </div>
        </Card>

        {/* KPI 2: Peak Month */}
        <Card glow="amber" padding="sm" className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Peak Demand Month</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          </span>
          <div className="text-xl font-bold font-mono text-amber-300">
            {summary.peak_month.month_label}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {formatNumberWithCommas(summary.peak_month.total_kwh)} kWh (Summer Peak)
          </div>
        </Card>

        {/* KPI 3: Lowest Month */}
        <Card glow="green" padding="sm" className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Lowest Month</span>
            <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
          </span>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {summary.lowest_month.month_label}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {formatNumberWithCommas(summary.lowest_month.total_kwh)} kWh (Winter/Recess)
          </div>
        </Card>

        {/* KPI 4: Solar Contribution */}
        <Card glow="green" padding="sm" className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Solar Generation</span>
            <Sun className="w-3.5 h-3.5 text-emerald-400" />
          </span>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {solarPct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {formatNumberWithCommas(summary.total_solar)} kWh self-generated
          </div>
        </Card>

        {/* KPI 5: Grid Dependency */}
        <Card glow="cyan" padding="sm" className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Grid Dependency</span>
          <div className="text-xl font-bold font-mono text-cyan-300">
            {gridPct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {formatNumberWithCommas(summary.total_grid)} kWh utility import
          </div>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Stacked Bar Chart */}
        <div className="lg:col-span-8">
          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Monthly Generation & Source Stack (kWh)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Cyan: Grid Power | Violet: Diesel Generator | Green: Solar Rooftop
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {displayedRecords.length} Months Displayed
              </span>
            </div>

            <EnergyStackedBar data={displayedRecords} height={340} />
          </Card>
        </div>

        {/* Source Distribution Donut Chart */}
        <div className="lg:col-span-4">
          <Card className="h-full flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sun className="w-4 h-4 text-emerald-400" />
                <span>Annual Power Mix Split</span>
              </h3>
            </div>

            <SourceDistribution summary={summary} height={280} />

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs space-y-1">
              <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Generator Dispatch Note:</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                DG backup was primarily engaged during monsoon storm grid cuts (Jul/Aug 2024). Winter generator
                fuel usage remained near zero.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Total Energy Trend Line */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Full Annual Total Energy Trajectory & Seasonal Peaks</span>
            </h3>
            <p className="text-xs text-slate-400">
              Amber reference dot indicates peak load (Jun 2025); Green indicates lowest month (Feb 2025).
            </p>
          </div>
        </div>

        <EnergyTrendLine
          data={records}
          height={280}
          peakMonth={summary.peak_month}
          lowestMonth={summary.lowest_month}
        />
      </Card>

      {/* Month-over-Month Changes Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-white">Month-over-Month (MoM) Consumption Ledger</h3>
            <p className="text-xs text-slate-400">Detailed month-by-month analysis of consumption shifts</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">12 Validated Billing Cycles</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Billing Month</th>
                <th className="py-3 px-4 text-right">Grid (kWh)</th>
                <th className="py-3 px-4 text-right">Generator (kWh)</th>
                <th className="py-3 px-4 text-right">Solar (kWh)</th>
                <th className="py-3 px-4 text-right font-bold text-white">Total (kWh)</th>
                <th className="py-3 px-4 text-right">MoM Change %</th>
                <th className="py-3 px-4">Seasonal Analysis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {records.map((rec, index) => {
                const mom = rec.mom_change_pct ?? 0;
                let note = 'Academic term steady state';
                if (rec.month === 11 || rec.month === 12) note = 'Winter recess cooling reduction';
                if (rec.month === 4) note = 'Semester exams start & AC runtime initiates';
                if (rec.month === 6) note = 'Peak North India summer heatwave';

                return (
                  <tr key={rec.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-sans font-bold text-slate-200">
                      {rec.month_label}
                    </td>
                    <td className="py-3 px-4 text-right text-cyan-300">
                      {formatNumberWithCommas(rec.grid_kwh)}
                    </td>
                    <td className="py-3 px-4 text-right text-purple-300">
                      {formatNumberWithCommas(rec.generator_kwh)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400">
                      {formatNumberWithCommas(rec.solar_kwh)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white">
                      {formatNumberWithCommas(rec.total_kwh)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {index === 0 ? (
                        <span className="text-slate-500 font-sans text-xs">Baseline</span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            mom > 0 ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {mom > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {formatPercent(mom)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-400 text-[11px]">
                      {note}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
