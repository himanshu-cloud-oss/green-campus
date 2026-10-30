import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus } from 'lucide-react';
import { useClassrooms } from '../hooks/useClassrooms';
import { api } from '../services/api';
import { errorMessage, LiveSnapshot, pilot, SpaceReading } from '../services/pilot';
import { ROOM_GRID, RoomRow, Switch } from '../components/classroom/RoomRow';

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toLocaleDateString('en-CA');
const nowHM = () => new Date().toTimeString().slice(0, 5);

const Figure: React.FC<{ label: string; value: string; unit?: string; tone?: 'waste' }> = ({ label, value, unit, tone }) => (
  <div>
    <dt className="section-title">{label}</dt>
    <dd className={`num text-[15px] font-semibold ${tone === 'waste' ? 'text-waste' : ''}`}>
      {value}
      {unit && <span className="font-sans text-xs font-medium text-panel-muted ml-1">{unit}</span>}
    </dd>
  </div>
);

export const ClassroomMonitoring: React.FC = () => {
  const [moment, setMoment] = useState<{ date: string; time: string } | null>(null);
  const live = moment === null;
  const { classrooms, isLoading, error, refetch } = useClassrooms(moment ?? undefined);
  const [snap, setSnap] = useState<LiveSnapshot | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const at = moment ? `${moment.date}T${moment.time}:00` : undefined;
  const loadSnap = useCallback(() => {
    pilot.live(at).then(setSnap).catch(() => setSnap(null));
  }, [at]);

  useEffect(() => {
    loadSnap();
    if (!live) return;
    const id = setInterval(loadSnap, 15000);
    return () => clearInterval(id);
  }, [loadSnap, live]);

  const readingFor = useMemo(() => {
    const map: Record<number, SpaceReading> = {};
    snap?.spaces.forEach(s => { if (s.classroom_id) map[s.classroom_id] = s; });
    return map;
  }, [snap]);

  const totals = useMemo(() => {
    let kw = 0, waste = 0, inUse = 0;
    classrooms.forEach(c => {
      const r = readingFor[c.id];
      kw += r?.kw ?? c.current_status?.energy_draw_kw ?? 0;
      waste += r?.waste_kw ?? 0;
      const st = c.current_status?.status;
      if (st === 'OCCUPIED' || st === 'BOOKED_EXTRA_CLASS') inUse += 1;
    });
    return { kw, waste, inUse };
  }, [classrooms, readingFor]);

  const act = async (roomId: number, fn: () => Promise<unknown>) => {
    setBusy(roomId);
    setActionError(null);
    try {
      await fn();
      await Promise.all([refetch(), pilot.live().then(setSnap)]);
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const shownAt = snap?.timestamp.slice(11, 16) ?? moment?.time ?? '';

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <h1 className="text-[17px] font-semibold">Classrooms</h1>
          <p className="text-xs text-panel-muted max-w-xl">
            The five bookable rooms on L Block 2nd floor. Who should be in each room comes from the timetable and bookings;
            switch states and kW are simulated from the device inventory.
          </p>
        </div>
        <dl className="flex gap-6 text-xs">
          <Figure label="In use" value={`${totals.inUse}`} unit={`/ ${classrooms.length || 5}`} />
          <Figure label="Drawing" value={fmt(totals.kw)} unit="kW" />
          <Figure label="Into empty rooms" value={fmt(totals.waste)} unit="kW" tone={totals.waste > 0 ? 'waste' : undefined} />
        </dl>
        <Link
          to="/book"
          className="ml-auto flex items-center gap-1.5 bg-panel-ink text-panel-ground text-xs font-semibold px-3 py-1.5 rounded-[3px] hover:bg-white snap"
        >
          <CalendarPlus className="w-3.5 h-3.5" strokeWidth={1.6} /> Book extra class
        </Link>
      </div>

      <section className="border border-panel-seam" aria-label="Rooms">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
          <h2 className="section-title mr-1">{moment ? `At ${moment.date} ${moment.time}` : `Live · ${shownAt}`} · simulated</h2>
          <div className="flex border border-panel-seam rounded-[3px]" role="group" aria-label="Moment shown">
            <button
              aria-pressed={live}
              onClick={() => setMoment(null)}
              className={`px-3 py-1 text-xs snap ${live ? 'bg-panel-seam text-panel-ink' : 'text-panel-muted hover:text-panel-ink'}`}
            >
              Live
            </button>
            <button
              aria-pressed={!live}
              onClick={() => setMoment(m => m ?? { date: today(), time: nowHM() })}
              className={`px-3 py-1 text-xs snap ${!live ? 'bg-panel-seam text-panel-ink' : 'text-panel-muted hover:text-panel-ink'}`}
            >
              Pick a moment
            </button>
          </div>
          {moment && (
            <>
              <label className="flex items-center gap-1.5">
                <span className="sr-only">Date</span>
                <input type="date" className="field num !w-auto !py-1" value={moment.date} onChange={e => e.target.value && setMoment({ ...moment, date: e.target.value })} />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="sr-only">Time</span>
                <input type="time" className="field num !w-auto !py-1" value={moment.time} onChange={e => e.target.value && setMoment({ ...moment, time: e.target.value })} />
              </label>
              <span className="text-xs text-panel-muted">Switching and tripping work on live only.</span>
            </>
          )}
          {(error || actionError) && <span className="text-xs text-lamp-on">{actionError ?? error}</span>}
        </div>

        <div className={`hidden lg:grid ${ROOM_GRID} gap-x-3 px-4 py-1.5 border-t border-panel-seam text-[11px] text-panel-muted`}>
          <span />
          <span>Room</span>
          <span>State</span>
          <span>In the room</span>
          <span>Switches · today</span>
          <span className="text-right">kW</span>
          <span />
        </div>

        {isLoading && classrooms.length === 0 ? (
          <div className="border-t border-panel-seam bg-panel-raised/40 h-64" aria-busy="true" aria-label="Loading rooms" />
        ) : classrooms.length === 0 ? (
          <p className="border-t border-panel-seam px-4 py-6 text-[13px] text-panel-muted">
            {error
              ? <>The backend isn't answering, so no rooms are shown. Start it with <code className="num text-panel-ink">uvicorn app.main:app --port 8000</code> in <code className="num">backend/</code>.</>
              : 'No classrooms are set up. Add bookable rooms in Floor maps.'}
          </p>
        ) : (
          <ul>
            {classrooms.map(room => {
              const reading = readingFor[room.id];
              return (
                <RoomRow
                  key={room.id}
                  room={room}
                  reading={reading}
                  live={live}
                  busy={busy === room.id}
                  onSwitch={(key: Switch, on) => act(room.id, () => api.updateDeviceState(room.id, { [key]: on, source: 'OVERRIDE' }))}
                  onTrip={() => reading && act(room.id, () => pilot.cut(reading.space_id))}
                  onRelease={() => reading && act(room.id, () => pilot.releaseCut(reading.space_id))}
                />
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-panel-muted max-w-3xl">
        TRIP switches off a room's controllable loads and keeps them off for the rest of today while the room is empty.
        Switch overrides also last for today. Both act on the simulation until relays are installed.
      </p>
    </div>
  );
};
