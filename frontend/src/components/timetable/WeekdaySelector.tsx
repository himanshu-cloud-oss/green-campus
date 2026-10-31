import React from 'react';
import { WEEKDAYS, Weekday } from '../../utils/timeUtils';

export interface WeekdaySelectorProps {
  selectedDay: Weekday;
  onSelectDay: (day: Weekday) => void;
  /** Today's weekday name, marked with a dot. */
  todayName?: string;
  /** Optional ISO date per weekday, shown under the day name. */
  dates?: Partial<Record<Weekday, string>>;
}

/** Mon–Fri segmented chips. */
export const WeekdaySelector: React.FC<WeekdaySelectorProps> = ({ selectedDay, onSelectDay, todayName, dates }) => (
  <div className="flex border border-panel-seam rounded-[3px]" role="group" aria-label="Weekday">
    {WEEKDAYS.map(day => {
      const on = selectedDay === day;
      const isToday = todayName === day;
      return (
        <button
          key={day}
          aria-pressed={on}
          onClick={() => onSelectDay(day)}
          className={`px-3 py-1 text-xs snap flex items-center gap-1.5 ${on ? 'bg-accent/10 text-accent font-semibold' : 'text-panel-muted hover:text-panel-ink'}`}
        >
          {day.slice(0, 3)}
          {dates?.[day] && <span className="num text-[11px] text-panel-muted">{dates[day]!.slice(8, 10)}</span>}
          {isToday && <span className="w-1.5 h-1.5 rounded-full bg-panel-ink" title="Today" aria-label="today" />}
        </button>
      );
    })}
  </div>
);
