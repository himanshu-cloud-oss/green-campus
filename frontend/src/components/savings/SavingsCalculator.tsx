import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { useSavings } from '../../hooks/useSavings';
import { formatCurrencyINR, formatNumberWithCommas } from '../../utils/formatters';
import { Zap, IndianRupee, CloudSun, ShieldCheck, HelpCircle, CheckSquare, Square } from 'lucide-react';

const CLASSROOMS_LIST = [
  { id: 1, name: 'LS-03', load: 4.5 },
  { id: 2, name: 'LS-04', load: 4.5 },
  { id: 3, name: 'LS-08', load: 5.2 },
  { id: 4, name: 'LS-09', load: 4.8 },
  { id: 5, name: 'LS-10', load: 5.5 },
];

export const SavingsCalculator: React.FC = () => {
  const [selectedRooms, setSelectedRooms] = useState<number[]>([1, 2, 3, 4, 5]);
  const [hoursAvoided, setHoursAvoided] = useState<number>(2.5);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(5);
  const [tariff, setTariff] = useState<number>(8.5);

  const selectedRoomsCount = selectedRooms.length;
  // Calculate average load of selected rooms
  const avgLoad =
    selectedRooms.length > 0
      ? selectedRooms.reduce((acc, id) => {
          const room = CLASSROOMS_LIST.find(r => r.id === id);
          return acc + (room?.load || 4.5);
        }, 0) / selectedRooms.length
      : 4.5;

  const { estimate } = useSavings({
    classroomsCount: selectedRoomsCount,
    hoursAvoided,
    daysPerWeek,
    tariffInr: tariff,
    loadKw: Math.round(avgLoad * 10) / 10,
  });

  const toggleRoom = (id: number) => {
    setSelectedRooms(prev =>
      prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  };

  const selectAllRooms = () => setSelectedRooms([1, 2, 3, 4, 5]);
  const clearRooms = () => setSelectedRooms([]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Input Parameters Controls */}
      <div className="lg:col-span-5 space-y-5">
        <Card>
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span>⚙️ Simulation Parameters</span>
          </h3>

          <div className="space-y-4">
            {/* Classroom Multi-Select */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300">
                  Target Classrooms ({selectedRooms.length} selected)
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllRooms}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    onClick={clearRooms}
                    className="text-[11px] text-slate-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CLASSROOMS_LIST.map(room => {
                  const isChecked = selectedRooms.includes(room.id);
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => toggleRoom(room.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all text-xs ${
                        isChecked
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-100">{room.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{room.load} kW</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Operating Hours Avoided Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-300">HVAC Hours Avoided / Day</span>
                <span className="font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  {hoursAvoided} hrs / day
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.5"
                value={hoursAvoided}
                onChange={e => setHoursAvoided(Number(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.5h (1 Period)</span>
                <span>4.0h (Half Day)</span>
                <span>8.0h (Full Day)</span>
              </div>
            </div>

            {/* Days per Week Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-300">Operating Days per Week</span>
                <span className="font-mono text-emerald-400 font-bold">{daysPerWeek} Days</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map(days => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDaysPerWeek(days)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      daysPerWeek === days
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {days} {days === 1 ? 'Day' : 'Days'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tariff Rate Input */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-300">Commercial Electricity Tariff</span>
                <span className="text-[11px] text-slate-400">Haryana DHBVN rate</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 text-xs font-mono">₹</span>
                <input
                  type="number"
                  min="4"
                  max="20"
                  step="0.1"
                  value={tariff}
                  onChange={e => setTariff(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-14 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
                <span className="absolute right-3 top-2 text-slate-500 text-[11px]">/ kWh</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Projection Results Cards */}
      <div className="lg:col-span-7 space-y-5">
        {/* Top 3 KPI Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card glow="cyan" padding="sm" className="space-y-1 bg-cyan-950/20">
            <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold">
              <Zap className="w-4 h-4" />
              <span>Daily Saved</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {formatNumberWithCommas(estimate.energy_saved_kwh, 1)} kWh
            </div>
            <div className="text-[10px] text-slate-400">
              from {selectedRoomsCount} classroom shutdowns
            </div>
          </Card>

          <Card glow="green" padding="sm" className="space-y-1 bg-emerald-950/20">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
              <IndianRupee className="w-4 h-4" />
              <span>Daily Cost Saved</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {formatCurrencyINR(estimate.cost_saved_inr)}
            </div>
            <div className="text-[10px] text-slate-400">
              at ₹{estimate.tariff_used}/kWh
            </div>
          </Card>

          <Card glow="amber" padding="sm" className="space-y-1 bg-amber-950/20">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
              <CloudSun className="w-4 h-4" />
              <span>CO₂ Avoided</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {formatNumberWithCommas(estimate.co2_avoided_kg, 1)} kg
            </div>
            <div className="text-[10px] text-slate-400">
              0.82 kg/kWh emission factor
            </div>
          </Card>
        </div>

        {/* Weekly & Monthly Aggregations */}
        <Card className="space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center justify-between">
            <span>📅 Financial & Environmental Projections</span>
            <span className="text-xs font-normal text-slate-400">Based on active academic terms</span>
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Weekly Summary ({daysPerWeek} days)
              </div>
              <div className="text-2xl font-mono font-bold text-cyan-400">
                {formatCurrencyINR(estimate.weekly_cost_inr)}
              </div>
              <div className="text-xs text-slate-300 font-mono">
                {formatNumberWithCommas(estimate.weekly_energy_kwh, 1)} kWh avoided
              </div>
            </div>

            <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Monthly Projection (4.33 weeks)
              </div>
              <div className="text-2xl font-mono font-bold text-emerald-400">
                {formatCurrencyINR(estimate.monthly_cost_inr)}
              </div>
              <div className="text-xs text-slate-300 font-mono">
                {formatNumberWithCommas(estimate.monthly_energy_kwh, 1)} kWh avoided
              </div>
            </div>
          </div>

          {/* Transparent Formula Display */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Transparent Formula Breakdown</span>
            </div>
            <div className="font-mono text-[11px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 overflow-x-auto">
              Daily kWh = {selectedRoomsCount} rooms × {hoursAvoided} hrs × {estimate.load_kw_used} kW ={' '}
              <span className="text-cyan-300 font-bold">{estimate.energy_saved_kwh} kWh</span>
            </div>
            <div className="font-mono text-[11px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 overflow-x-auto">
              Daily Cost = {estimate.energy_saved_kwh} kWh × ₹{estimate.tariff_used} ={' '}
              <span className="text-emerald-300 font-bold">{formatCurrencyINR(estimate.cost_saved_inr)}</span>
            </div>
          </div>

          {/* Assumption Notes */}
          <div className="space-y-1 text-[11px] text-slate-500">
            <div className="font-semibold text-slate-400 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Assumptions & Benchmark Standard</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5">
              {estimate.assumptions.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};
