import React, { useEffect, useState } from 'react';
import { BookingRecord, pilot, SlotOption, TimetableSlot } from '../../services/pilot';

const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const START = 8 * 60; // 08:00
const END = 19 * 60; // 19:00
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const pct = (m: number) => `${((Math.min(Math.max(m, START), END) - START) / (END - START)) * 100}%`;
const span = (a: string, b: string) => ({ left: pct(toMin(a)), width: `calc(${pct(toMin(b))} - ${pct(toMin(a))})` });

interface Props {
  date: string;
  rooms: { code: string; classroomId: number; capacity: number | null }[];
  chosen: SlotOption;
  alternatives: SlotOption[];
}

/** One day, every bookable room: classes, extra bookings, the pick and the alternatives on one time axis. */
export const RoomDayStrip: React.FC<Props> = ({ date, rooms, chosen, alternatives }) => {
  const [classes, setClasses] = useState<TimetableSlot[]>([]);
  const [extras, setExtras] = useState<BookingRecord[]>([]);

  useEffect(() => {
    const wd = DAY_CODES[new Date(`${date}T12:00:00`).getDay()];
    pilot.timetable(wd).then(setClasses).catch(() => setClasses([]));
    pilot.bookings({ date, status: 'ACTIVE' }).then(setExtras).catch(() => setExtras([]));
  }, [date, chosen]);

  const alts = alternatives.filter(a => a.date === date);
  const hours = Array.from({ length: (END - START) / 60 + 1 }, (_, i) => START / 60 + i);

  return (
    <figure aria-label={`Rooms on ${date}`}>
      <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-2">
        <span />
        <div className="relative h-4">
          {hours.map(h => (
            <span key={h} className="absolute -translate-x-1/2 num text-[10.5px] text-panel-muted" style={{ left: pct(h * 60) }}>{String(h).padStart(2, '0')}</span>
          ))}
        </div>
        {rooms.map(r => (
          <React.Fragment key={r.code}>
            <span className="num text-xs py-1.5">{r.code}<span className="text-panel-muted"> {r.capacity}</span></span>
            <div className="relative h-7 border-t border-panel-seam">
              {hours.map(h => <span key={h} className="absolute top-0 bottom-0 w-px bg-panel-seam/60" style={{ left: pct(h * 60) }} />)}
              <span className="absolute top-1 bottom-1 bg-[repeating-linear-gradient(135deg,#222833_0_3px,transparent_3px_7px)]" style={span('11:30', '12:20')} title="Lunch" />
              {classes.filter(c => c.classroom_id === r.classroomId).map(c => (
                <span key={c.id} className="absolute top-1 bottom-1 bg-panel-seam border border-panel-wire" style={span(c.start_time, c.end_time)} title={`${c.subject} · ${c.teacher}`} />
              ))}
              {extras.filter(b => b.classroom_id === r.classroomId).map(b => (
                <span key={b.id} className="absolute top-1 bottom-1 bg-panel-wire" style={span(b.start_time, b.end_time)} title={`Extra: ${b.subject}`} />
              ))}
              {alts.filter(a => a.room === r.code).map(a => (
                <span key={a.start_time} className="absolute top-0.5 bottom-0.5 border border-dashed border-panel-ink" style={span(a.start_time, a.end_time)} title={`Alternative ${a.start_time} · ${a.est_kwh} kWh`} />
              ))}
              {chosen.date === date && chosen.room === r.code && (
                <span className="absolute top-0.5 bottom-0.5 bg-panel-ink" style={span(chosen.start_time, chosen.end_time)} title={`Pick ${chosen.start_time} · ${chosen.est_kwh} kWh`} />
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
      <figcaption className="flex flex-wrap gap-4 mt-2 text-xs text-panel-muted">
        <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 bg-panel-seam border border-panel-wire" />Timetabled class</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 bg-panel-wire" />Extra class</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 bg-panel-ink" />Pick</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 border border-dashed border-panel-ink" />Alternative</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 bg-[repeating-linear-gradient(135deg,#3A414D_0_2px,transparent_2px_5px)]" />Lunch</span>
      </figcaption>
    </figure>
  );
};
