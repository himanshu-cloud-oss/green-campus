import React from 'react';
import { PeriodDefinition } from '../../types';
import { Clock } from 'lucide-react';

export interface PeriodSelectorProps {
  periods: PeriodDefinition[];
  selectedPeriodNumber: string;
  onSelectPeriod: (periodNumber: string) => void;
  activePeriodNumber?: string | null;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  periods,
  selectedPeriodNumber,
  onSelectPeriod,
  activePeriodNumber,
}) => {
  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
      <select
        value={selectedPeriodNumber}
        onChange={e => onSelectPeriod(e.target.value)}
        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
      >
        <option value="ALL">All Periods (Full Day)</option>
        {periods.map(p => (
          <option key={p.period_number} value={p.period_number}>
            {p.label} ({p.start_time} - {p.end_time})
            {activePeriodNumber === p.period_number ? ' • Current' : ''}
          </option>
        ))}
      </select>
    </div>
  );
};
