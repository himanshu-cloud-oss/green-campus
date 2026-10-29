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
import { MonthlyEnergyRecord } from '../../types';
import { formatNumberWithCommas } from '../../utils/formatters';

export interface EnergyStackedBarProps {
  data: MonthlyEnergyRecord[];
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((acc: number, curr: any) => acc + (Number(curr.value) || 0), 0);
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 backdrop-blur-md">
        <p className="font-bold text-white mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}:</span>
            </span>
            <span className="font-mono font-semibold text-slate-200">
              {formatNumberWithCommas(entry.value)} kWh
            </span>
          </div>
        ))}
        <div className="border-t border-slate-800 pt-1.5 mt-1 flex items-center justify-between font-bold text-slate-100">
          <span>Total:</span>
          <span className="font-mono text-cyan-400">{formatNumberWithCommas(total)} kWh</span>
        </div>
      </div>
    );
  }
  return null;
};

export const EnergyStackedBar: React.FC<EnergyStackedBarProps> = ({ data, height = 340 }) => {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="month_label"
            stroke="#64748b"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={{ stroke: '#334155' }}
            axisLine={{ stroke: '#334155' }}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={{ stroke: '#334155' }}
            axisLine={{ stroke: '#334155' }}
            tickFormatter={val => `${Math.round(val / 1000)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: '12px' }}
            formatter={val => <span className="text-xs text-slate-300 font-medium">{val}</span>}
          />
          <Bar
            dataKey="grid_kwh"
            name="Grid Power"
            stackId="energy"
            fill="#06b6d4"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="generator_kwh"
            name="Diesel Generator"
            stackId="energy"
            fill="#7c3aed"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="solar_kwh"
            name="Solar Rooftop"
            stackId="energy"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
