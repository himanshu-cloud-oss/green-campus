import React from 'react';
import { WEEKDAYS, Weekday } from '../../utils/timeUtils';
import { Calendar } from 'lucide-react';

export interface WeekdaySelectorProps {
  selectedDay: string;
  onSelectDay: (day: Weekday) => void;
  currentDayName?: string;
}

export const WeekdaySelector: React.FC<WeekdaySelectorProps> = ({
  selectedDay,
  onSelectDay,
  currentDayName,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mr-1">
        <Calendar className="w-4 h-4 text-cyan-400" />
        <span>Weekday:</span>
      </div>
      <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
        {WEEKDAYS.map(day => {
          const isSelected = selectedDay.toLowerCase() === day.toLowerCase();
          const isToday = currentDayName?.toLowerCase() === day.toLowerCase();

          return (
            <button
              key={day}
              onClick={() => onSelectDay(day)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
                isSelected
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <span>{day.slice(0, 3)}</span>
              {isToday && (
                <span
                  className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${
                    isSelected ? 'bg-slate-950' : 'bg-cyan-400'
                  }`}
                  title="Today"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
