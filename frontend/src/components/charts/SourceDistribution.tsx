import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { EnergySummary } from '../../types';
import { formatNumberWithCommas } from '../../utils/formatters';

export interface SourceDistributionProps {
  summary: EnergySummary;
  height?: number;
}

const COLORS = ['#06b6d4', '#7c3aed', '#22c55e'];

export const SourceDistribution: React.FC<SourceDistributionProps> = ({ summary, height = 300 }) => {
  const data = [
    { name: 'Grid Power', value: summary.total_grid, color: COLORS[0] },
    { name: 'Diesel Generator', value: summary.total_generator, color: COLORS[1] },
    { name: 'Solar Generation', value: summary.total_solar, color: COLORS[2] },
  ];

  const total = summary.total_all || data.reduce((a, b) => a + b.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const pct = ((item.value / total) * 100).toFixed(1);
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs backdrop-blur-md">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.payload.color }} />
            <span className="font-bold text-white">{item.name}</span>
          </div>
          <div className="text-slate-300 font-mono text-xs">
            {formatNumberWithCommas(item.value)} kWh
          </div>
          <div className="text-cyan-400 font-mono text-xs font-semibold mt-0.5">
            {pct}% of annual supply
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full flex flex-col items-center justify-center" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ paddingTop: '8px' }}
            formatter={(value, entry: any) => {
              const item = data.find(d => d.name === value);
              const pct = item && total ? ((item.value / total) * 100).toFixed(1) : '0';
              return (
                <span className="text-xs text-slate-300">
                  {value} <span className="font-mono text-slate-400">({pct}%)</span>
                </span>
              );
            }}
          />
          <Pie
            data={data}
            cx="50%"
            cy="46%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="#0a0f1e" strokeWidth={2} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
