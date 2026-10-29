import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { SavingsChart } from '../charts/SavingsChart';
import { formatCurrencyINR, formatNumberWithCommas } from '../../utils/formatters';
import { calculateSavings } from '../../utils/energyUtils';
import { Sliders, TrendingUp, Trees, DollarSign } from 'lucide-react';

export const WhatIfAnalysis: React.FC = () => {
  const [classroomsCount, setClassroomsCount] = useState<number>(20); // Campus-wide scale
  const [hoursAvoided, setHoursAvoided] = useState<number>(3.0);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(5);
  const [tariff, setTariff] = useState<number>(8.5);

  const estimate = calculateSavings({
    classroomsCount,
    hoursAvoided,
    daysPerWeek,
    tariffInr: tariff,
    loadKw: 4.8, // average across campus
  });

  // Calculate annual savings (assuming 10 active teaching months per year)
  const annualSavingsKwh = estimate.monthly_energy_kwh * 10;
  const annualSavingsInr = estimate.monthly_cost_inr * 10;
  const annualCo2Kg = estimate.co2_avoided_kg * daysPerWeek * 4.33 * 10;

  // Baseline monthly assumption for campus-wide scale
  const simulatedCampusBaselineKwh = classroomsCount * 8 * 4.8 * daysPerWeek * 4.33;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-4 text-cyan-400 font-bold text-base">
              <Sliders className="w-5 h-5" />
              <span>Campus Scaling Parameters</span>
            </div>

            <div className="space-y-5">
              {/* Classrooms Count Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-300">Total Classrooms in Scope</span>
                  <span className="font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                    {classroomsCount} Classrooms
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  step="1"
                  value={classroomsCount}
                  onChange={e => setClassroomsCount(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>1 Room</span>
                  <span>30 Rooms (Academic Wing)</span>
                  <span>60 (Whole Campus)</span>
                </div>
              </div>

              {/* Operating Hours Avoided Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-300">Vacant Hours Automated / Day</span>
                  <span className="font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                    {hoursAvoided} hrs / day
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="0.5"
                  value={hoursAvoided}
                  onChange={e => setHoursAvoided(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>1.0 hr</span>
                  <span>4.0 hrs</span>
                  <span>8.0 hrs</span>
                </div>
              </div>

              {/* Operating Days per Week */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-300">Weekly Schedule Intensity</span>
                  <span className="font-mono text-emerald-400 font-bold">{daysPerWeek} Days / Wk</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDaysPerWeek(d)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        daysPerWeek === d
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Tariff Rate */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-300">Tariff Multiplier</span>
                  <span className="font-mono text-slate-300">₹{tariff} / kWh</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="14"
                  step="0.5"
                  value={tariff}
                  onChange={e => setTariff(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Impact Visual Column */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Monthly Consumption Comparison</span>
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                {classroomsCount} Classrooms at Scale
              </span>
            </div>

            <SavingsChart
              currentMonthlyKwh={simulatedCampusBaselineKwh}
              savingsMonthlyKwh={estimate.monthly_energy_kwh}
              tariffInr={tariff}
              height={260}
            />
          </Card>

          {/* Annual Campus ROI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card glow="green" padding="sm" className="bg-emerald-950/20 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                <DollarSign className="w-4 h-4" />
                <span>Annual Cost Saved</span>
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {formatCurrencyINR(annualSavingsInr)}
              </div>
              <div className="text-[10px] text-slate-400">
                Based on 10 active university months
              </div>
            </Card>

            <Card glow="cyan" padding="sm" className="bg-cyan-950/20 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold">
                <TrendingUp className="w-4 h-4" />
                <span>Annual Energy Saved</span>
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {formatNumberWithCommas(annualSavingsKwh, 0)} kWh
              </div>
              <div className="text-[10px] text-slate-400">
                Avoided unneeded HVAC runtime
              </div>
            </Card>

            <Card glow="amber" padding="sm" className="bg-amber-950/20 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                <Trees className="w-4 h-4" />
                <span>Annual CO₂ Abatement</span>
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {formatNumberWithCommas(annualCo2Kg / 1000, 1)} Tons
              </div>
              <div className="text-[10px] text-slate-400">
                Equivalent to ~{Math.round(annualCo2Kg / 22)} urban trees planted
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
