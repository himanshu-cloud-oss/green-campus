import React from 'react';
import { Classroom, ExtraClassBooking, PeriodDefinition, TimetableEntry } from '../../types';

export interface TimetableGridProps {
  entries: TimetableEntry[];
  /** Active extra-class bookings on the date shown. */
  bookings: ExtraClassBooking[];
  periods: PeriodDefinition[];
  rooms: Classroom[];
  /** Period running now, when the day shown is today. */
  currentPeriod?: string | null;
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const overlaps = (b: ExtraClassBooking, p: PeriodDefinition) =>
  toMin(b.start_time) < toMin(p.end_time) && toMin(b.end_time) > toMin(p.start_time);

/** Periods down, rooms across. Classes as text, extra classes on solid Wire, lunch hatched. */
export const TimetableGrid: React.FC<TimetableGridProps> = ({ entries, bookings, periods, rooms, currentPeriod }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-xs" style={{ minWidth: 120 + rooms.length * 150 }}>
      <thead>
        <tr className="text-left text-[11px] text-panel-muted">
          <th scope="col" className="sticky left-0 z-10 bg-panel-ground font-medium px-4 py-1.5 w-[120px]">Period</th>
          {rooms.map(r => (
            <th key={r.id} scope="col" className="font-medium px-3 py-1.5 border-l border-panel-seam">
              <span className="num text-[13px] font-semibold text-panel-ink">{r.name}</span>
              <span className="num ml-1.5">{r.capacity}</span> seats
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {periods.map(p => {
          const now = currentPeriod === p.period_number;
          if (p.is_break) {
            return (
              <tr key={p.period_number} className="border-t border-panel-seam">
                <th scope="row" className="sticky left-0 z-10 bg-panel-ground text-left font-normal px-4 py-1.5">
                  <span className="text-panel-muted">Lunch</span>
                  <span className="block num text-[11px] text-panel-muted">{p.start_time}–{p.end_time}</span>
                </th>
                <td colSpan={rooms.length} className="border-l border-panel-seam p-1">
                  <div className="h-7 bg-[repeating-linear-gradient(135deg,#222833_0_3px,transparent_3px_7px)]" aria-label="Lunch break" />
                </td>
              </tr>
            );
          }
          return (
            <tr key={p.period_number} className={`border-t border-panel-seam align-top ${now ? 'bg-panel-raised' : ''}`}>
              <th scope="row" className={`sticky left-0 z-10 text-left font-normal px-4 py-2 ${now ? 'bg-panel-raised' : 'bg-panel-ground'}`}>
                <span className="text-panel-ink">P<span className="num">{p.period_number}</span></span>
                {now && <span className="ml-1.5 text-2xs font-semibold uppercase text-panel-ink">Now</span>}
                <span className="block num text-[11px] text-panel-muted">{p.start_time}–{p.end_time}</span>
              </th>
              {rooms.map(r => {
                const entry = entries.find(e => e.classroom_id === r.id && e.period_number === p.period_number);
                const extra = bookings.find(b => b.classroom_id === r.id && overlaps(b, p));
                return (
                  <td key={r.id} className="border-l border-panel-seam px-1.5 py-1.5">
                    {extra ? (
                      <div className="bg-panel-wire rounded-[2px] px-1.5 py-1" title={`Extra class · ${extra.subject ?? ''}`}>
                        <div className="truncate text-panel-ink">Extra · {extra.subject || 'untitled'}</div>
                        <div className="num text-[11px] text-panel-ink/70">{extra.start_time}–{extra.end_time}</div>
                      </div>
                    ) : entry ? (
                      <div className="px-1.5 py-1" title={`${entry.subject} · ${entry.teacher}`}>
                        <div className="truncate text-panel-ink">{entry.subject}</div>
                        <div className="truncate text-[11px] text-panel-muted">{entry.teacher}{entry.section ? ` · ${entry.section}` : ''}</div>
                      </div>
                    ) : (
                      <div className="px-1.5 py-1 text-panel-muted" aria-label="Free">—</div>
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
