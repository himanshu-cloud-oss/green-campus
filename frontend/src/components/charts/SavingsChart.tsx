import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { formatNumberWithCommas, formatCurrencyINR } from '../../utils/formatters';

export interface SavingsChartProps {
  currentMonthlyKwh: number;
  savingsMonthlyKwh: number;
  tariffInr?: number;
  height?: number;
}

export const SavingsChart: React.FC<SavingsChartProps> = ({
  currentMonthlyKwh,
  savingsMonthlyKwh,
  tariffInr = 8.5,
  height = 280,
}) => {
  const optimizedMonthlyKwh = Math.max(0, currentMonthlyKwh - savingsMonthlyKwh);

  const data = [
    {
      period: 'Monthly Profile',
      Unoptimized: Math.round(currentMonthlyKwh),
      OptimizedWithAI: Math.round(optimizedMonthlyKwh),
      SavedKwh: Math.round(savingsMonthlyKwh),
      CostBefore: Math.round(currentMonthlyKwh * tariffInr),
      CostAfter: Math.round(optimizedMonthlyKwh * tariffInr),
      CostSaved: Math.round(savingsMonthlyKwh * tariffInr),
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1 backdrop-blur-md">
          <p className="font-bold text-white mb-1">Energy Optimization Impact</p>
          <div className="flex justify-between gap-4 text-slate-300">
            <span>Current Consumption:</span>
            <span className="font-mono text-slate-200">{formatNumberWithCommas(item.Unoptimized)} kWh</span>
          </div>
          <div className="flex justify-between gap-4 text-cyan-400 font-semibold">
            <span>AI Optimized:</span>
            <span className="font-mono">{formatNumberWithCommas(item.OptimizedWithAI)} kWh</span>
          </div>
          <div className="border-t border-slate-800 pt-1 flex justify-between gap-4 text-emerald-400 font-bold">
            <span>Avoided Waste:</span>
            <span className="font-mono">-{formatNumberWithCommas(item.SavedKwh)} kWh ({formatCurrencyINR(item.CostSaved)})</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="period" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis
            stroke="#64748b"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={val => `${Math.round(val / 1000)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            formatter={val => (
              <span className="text-xs text-slate-300 font-medium">
                {val === 'Unoptimized' ? 'Current Baseline' : 'Optimized with Green Campus AI'}
              </span>
            )}
          />
          <Bar dataKey="Unoptimized" fill="#475569" radius={[4, 4, 0, 0]} maxBarSize={90} />
          <Bar dataKey="OptimizedWithAI" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={90} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
