import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTimetable } from '../hooks/useTimetable';
import { useBookings } from '../hooks/useBookings';
import { useLiveClock } from '../hooks/useLiveClock';
import { TimetableGrid } from '../components/timetable/TimetableGrid';
import { WeekdaySelector } from '../components/timetable/WeekdaySelector';
import { api } from '../services/api';
import { errorMessage } from '../services/pilot';
import { Classroom } from '../types';
import { WEEKDAYS, Weekday } from '../utils/timeUtils';
import { alpha, deptColor, useTheme } from '../theme';
import { usePaths } from '../styles/StyleContext';

const iso = (d: Date) => d.toLocaleDateString('en-CA');
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Mon–Fri dates of this teaching week (next week's on a weekend). */
function weekDates(): Record<Weekday, string> {
  const d = new Date();
  const dow = d.getDay(); // 0 Sun … 6 Sat
  const monday = new Date(d);
  monday.setDate(d.getDate() + (dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow));
  return Object.fromEntries(
    WEEKDAYS.map((day, i) => {
      const x = new Date(monday);
      x.setDate(monday.getDate() + i);
      return [day, iso(x)];
    })
  ) as Record<Weekday, string>;
}

export const Timetable: React.FC = () => {
  const path = usePaths();
  const { p } = useTheme();
  const clock = useLiveClock();
  const dates = useMemo(weekDates, []);
  const todayName = (WEEKDAYS as readonly string[]).includes(clock.weekday) ? (clock.weekday as Weekday) : undefined;
  const [day, setDay] = useState<Weekday>(todayName ?? 'Monday');
  const [roomFilter, setRoomFilter] = useState<number | 'ALL'>('ALL');
  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const { entries, periods, isLoading, error } = useTimetable(day);
  const { bookings } = useBookings();

  useEffect(() => {
    api.listClassrooms().then(setRooms).catch(e => setRoomsError(errorMessage(e)));
  }, []);

  const date = dates[day];
  const dayBookings = useMemo(() => bookings.filter(b => b.status === 'ACTIVE' && b.date === date), [bookings, date]);
  const shownRooms = roomFilter === 'ALL' ? rooms : rooms.filter(r => r.id === roomFilter);

  // clock re-renders every second; read the 24 h time directly.
  const nowMin = toMin(new Date().toTimeString().slice(0, 5));
  const currentPeriod =
    date === iso(new Date())
      ? periods.find(p => nowMin >= toMin(p.start_time) && nowMin < toMin(p.end_time))?.period_number ?? null
      : null;

  const classCount = entries.filter(e => shownRooms.some(r => r.id === e.classroom_id)).length;
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
  const failed = error || roomsError;

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <h1 className="text-[17px] font-semibold">Timetable</h1>
          <p className="text-xs text-panel-muted max-w-xl">
            Classes for the bookable rooms, periods 1–10, with this week's extra-class bookings laid over them.
            The floor panel uses this to tell an empty room from one in use.
          </p>
        </div>
        <dl className="flex gap-6 text-xs">
          <div>
            <dt className="section-title">Classes</dt>
            <dd className="num text-[15px] font-semibold">{classCount}</dd>
          </div>
          <div>
            <dt className="section-title">Extra classes</dt>
            <dd className="num text-[15px] font-semibold">{dayBookings.length}</dd>
          </div>
        </dl>
        <Link to={path('/book')} className="ml-auto text-xs border border-panel-wire hover:border-accent hover:text-accent px-3 py-1.5 rounded-[3px] snap">
          Book extra class
        </Link>
      </div>

      <section className="border border-panel-seam" aria-label={`Timetable for ${dateLabel}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 border-b border-panel-seam">
          <h2 className="section-title mr-1">{dateLabel}</h2>
          <WeekdaySelector selectedDay={day} onSelectDay={setDay} todayName={todayName} dates={dates} />
          <div className="flex flex-wrap gap-1" role="group" aria-label="Rooms shown">
            {[{ id: 'ALL' as const, name: 'All rooms' }, ...rooms].map(r => {
              const on = roomFilter === r.id;
              return (
                <button
                  key={r.id}
                  aria-pressed={on}
                  onClick={() => setRoomFilter(r.id)}
                  className={`text-xs px-2.5 py-1 rounded-[3px] border snap ${r.id === 'ALL' ? '' : 'num'} ${
                    on ? 'border-accent bg-accent/10 text-accent font-semibold' : 'border-panel-seam text-panel-muted hover:border-panel-wire'
                  }`}
                >
                  {r.name}
                </button>
              );
            })}
          </div>
          {failed && <span className="text-xs text-lamp-on">{failed}</span>}
        </div>

        {isLoading && entries.length === 0 ? (
          <div className="bg-panel-raised/40 h-80" aria-busy="true" aria-label="Loading timetable" />
        ) : rooms.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-panel-muted">
            {failed ? 'The backend is not reachable, so the timetable cannot be shown.' : 'No bookable rooms are set up yet.'}
          </p>
        ) : (
          <TimetableGrid entries={entries} bookings={dayBookings} periods={periods} rooms={shownRooms} currentPeriod={currentPeriod} />
        )}

        <div className="flex flex-wrap gap-4 px-4 py-2 border-t border-panel-seam text-xs text-panel-muted">
          {([['CSE', 'CSE classes'], ['ECE', 'ECE classes'], ['ME', 'ME classes']] as const).map(([d, l]) => (
            <span key={d} className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded-[2px]" style={{ background: alpha(deptColor(p, d), 0.45) }} />{l}</span>
          ))}
          <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded-[2px] bg-accent/15 border border-accent/40" />Extra class</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 bg-[repeating-linear-gradient(135deg,rgb(var(--c-wire))_0_2px,transparent_2px_5px)]" />Lunch</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 bg-panel-raised border border-panel-seam" />Period running now</span>
        </div>
      </section>
    </div>
  );
};
