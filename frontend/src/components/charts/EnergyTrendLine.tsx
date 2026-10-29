import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from 'recharts';
import { MonthlyEnergyRecord } from '../../types';
import { formatNumberWithCommas } from '../../utils/formatters';

export interface EnergyTrendLineProps {
  data: MonthlyEnergyRecord[];
  height?: number;
  peakMonth?: MonthlyEnergyRecord;
  lowestMonth?: MonthlyEnergyRecord;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const momChange = payload[0].payload.mom_change_pct;
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1 backdrop-blur-md">
        <p className="font-bold text-white mb-0.5">{label}</p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-cyan-400 font-medium">Total Consumption:</span>
          <span className="font-mono font-bold text-slate-100">{formatNumberWithCommas(val)} kWh</span>
        </div>
        {momChange !== undefined && (
          <div className="flex items-center justify-between gap-4 text-[11px]">
            <span className="text-slate-400">MoM Change:</span>
            <span
              className={`font-mono font-semibold ${
                momChange > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {momChange > 0 ? `+${momChange}%` : `${momChange}%`}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const EnergyTrendLine: React.FC<EnergyTrendLineProps> = ({
  data,
  height = 280,
  peakMonth,
  lowestMonth,
}) => {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
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

          {/* Peak Month Marker */}
          {peakMonth && (
            <ReferenceDot
              x={peakMonth.month_label}
              y={peakMonth.total_kwh}
              r={6}
              fill="#f59e0b"
              stroke="#0f172a"
              strokeWidth={2}
            />
          )}

          {/* Lowest Month Marker */}
          {lowestMonth && (
            <ReferenceDot
              x={lowestMonth.month_label}
              y={lowestMonth.total_kwh}
              r={6}
              fill="#22c55e"
              stroke="#0f172a"
              strokeWidth={2}
            />
          )}

          <Line
            type="monotone"
            dataKey="total_kwh"
            name="Total kWh"
            stroke="#06b6d4"
            strokeWidth={3}
            dot={{ r: 4, fill: '#06b6d4', stroke: '#082f49', strokeWidth: 2 }}
            activeDot={{ r: 7, fill: '#38bdf8', stroke: '#0284c7', strokeWidth: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
