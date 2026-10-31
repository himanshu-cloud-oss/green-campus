import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RotateCcw, Power, Undo2 } from 'lucide-react';
import { SingleLineDiagram } from '../components/panel/SingleLineDiagram';
import { LoadRibbon } from '../components/panel/LoadRibbon';
import { CategoryDot } from '../components/ui/CategoryChip';
import {
  BookingRecord,
  CATEGORY_LABEL,
  Category,
  errorMessage,
  LiveSnapshot,
  MonthEstimate,
  pilot,
  SeriesPoint,
  SpaceReading,
  STATE_LABEL,
  TimetableSlot,
} from '../services/pilot';

const LIVE_MS = 15000;
const STEP_MIN = 10;
const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const fmt = (n: number, d = 2) => n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const hhmm = (t: string) => t.slice(0, 5);

/** "2 AC · 8 lights · 1 AV" from the switchable devices currently on. */
function onSummary(s: SpaceReading): string {
  const order: Category[] = ['HVAC', 'LIGHTING', 'FAN', 'AV'];
  return order
    .map(c => {
      const n = s.assets.filter(a => a.category === c && a.controllable).reduce((k, a) => k + a.on_count, 0);
      if (!n) return null;
      if (c === 'HVAC' || c === 'AV') return `${n} ${CATEGORY_LABEL[c]}`;
      const word = CATEGORY_LABEL[c].toLowerCase();
      return `${n} ${n === 1 ? word.replace(/s$/, '') : word}`;
    })
    .filter(Boolean)
    .join(' · ');
}

const SHORT_STATE: Partial<Record<string, string>> = {
  LUNCH: 'lunch', VACANT: 'free period', NO_SHOW: 'not held', AFTER_HOURS: 'after hours', CLOSED: 'closed',
};

interface NextEvent {
  time: string;
  starts: string[];
  empties: string[];
  extras: string[];
}

const Kpi: React.FC<{ label: string; value: string; unit?: string; tone?: 'waste' }> = ({ label, value, unit, tone }) => (
  <div className="px-5 py-2.5 border-r border-panel-seam min-w-[132px]">
    <div className="section-title">{label}</div>
    <div className={`num text-[22px] leading-7 font-semibold ${tone === 'waste' ? 'text-waste' : 'text-panel-ink'}`}>
      {value}
      {unit && <span className="font-sans text-xs font-medium text-panel-muted ml-1">{unit}</span>}
    </div>
  </div>
);

export const Overview: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [snap, setSnap] = useState<LiveSnapshot | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [dayPoints, setDayPoints] = useState<SeriesPoint[]>([]);
  const [month, setMonth] = useState<MonthEstimate | null>(null);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const at = params.get('at');
  const selected = params.get('room');

  const load = useCallback(async () => {
    try {
      setSnap(await pilot.live(at ?? undefined));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [at]);

  const loadSeries = useCallback(() => {
    pilot.series(24, STEP_MIN).then(r => setSeries(r.points)).catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    if (at) return;
    const id = setInterval(load, LIVE_MS);
    const onRefresh = () => load();
    window.addEventListener('gc:refresh', onRefresh);
    return () => {
      clearInterval(id);
      window.removeEventListener('gc:refresh', onRefresh);
    };
  }, [load, at]);

  useEffect(() => {
    loadSeries();
    pilot.month().then(setMonth).catch(() => undefined);
    const id = setInterval(loadSeries, 60000);
    return () => clearInterval(id);
  }, [loadSeries]);

  // Everything below is measured from the moment shown (live or replayed).
  const momentDate = snap?.timestamp.slice(0, 10);
  const momentTime = snap?.timestamp.slice(11, 16);

  useEffect(() => {
    if (!snap) return;
    const t = new Date(snap.timestamp);
    const hours = Math.max(STEP_MIN / 60, t.getHours() + t.getMinutes() / 60);
    pilot.series(hours, STEP_MIN, snap.timestamp).then(r => setDayPoints(r.points)).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momentDate, at, snap?.timestamp.slice(0, 15)]);

  useEffect(() => {
    if (!momentDate) return;
    const wd = DAY_CODES[new Date(`${momentDate}T12:00:00`).getDay()];
    pilot.timetable(wd).then(setTimetable).catch(() => setTimetable([]));
    pilot.bookings({ date: momentDate, status: 'ACTIVE' }).then(setBookings).catch(() => setBookings([]));
  }, [momentDate]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const waste = useMemo(
    () => (snap?.spaces ?? []).filter(s => s.waste_kw > 0).sort((a, b) => b.waste_kw - a.waste_kw),
    [snap]
  );
  const sel = snap?.spaces.find(s => s.code === selected) ?? null;
  const dayKwh = useMemo(
    () => dayPoints.filter(p => p.t.startsWith(momentDate ?? '')).reduce((n, p) => n + p.kw * (STEP_MIN / 60), 0),
    [dayPoints, momentDate]
  );

  const nextEvents = useMemo<NextEvent[]>(() => {
    if (!snap || !momentTime) return [];
    const codeOf: Record<number, string> = {};
    snap.spaces.forEach(s => { if (s.classroom_id) codeOf[s.classroom_id] = s.code; });
    const slots = [
      ...timetable.map(e => ({ cid: e.classroom_id, start: hhmm(e.start_time), end: hhmm(e.end_time), extra: null as string | null })),
      ...bookings.map(b => ({ cid: b.classroom_id, start: hhmm(b.start_time), end: hhmm(b.end_time), extra: b.subject })),
    ].filter(x => codeOf[x.cid]);
    const times = Array.from(new Set(slots.flatMap(x => [x.start, x.end]))).filter(t => t > momentTime).sort().slice(0, 4);
    return times.map(time => {
      const starting = slots.filter(x => x.start === time);
      const startingRooms = new Set(starting.map(x => x.cid));
      return {
        time,
        starts: Array.from(startingRooms).map(c => codeOf[c]).sort(),
        empties: Array.from(new Set(slots.filter(x => x.end === time && !startingRooms.has(x.cid)).map(x => codeOf[x.cid]))).sort(),
        extras: starting.filter(x => x.extra).map(x => `${x.extra} · ${codeOf[x.cid]}`),
      };
    });
  }, [snap, momentTime, timetable, bookings]);

  const act = async (s: SpaceReading, fn: () => Promise<unknown>) => {
    setBusy(s.space_id);
    try {
      await fn();
      await load();
      loadSeries();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  if (!snap) {
    return (
      <div className="p-8 text-sm text-panel-muted">
        {error ? (
          <div className="max-w-md space-y-2">
            <div className="text-panel-ink font-semibold">The floor panel can't reach the backend.</div>
            <div>{error} Start it with <code className="num text-panel-ink">uvicorn app.main:app --port 8000</code> in <code className="num">backend/</code>, then this page reconnects by itself.</div>
          </div>
        ) : (
          <div className="h-[60vh] border border-panel-seam bg-panel-raised/40" aria-busy="true" aria-label="Loading floor panel" />
        )}
      </div>
    );
  }

  const replayDay = at ? new Date(`${momentDate}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] xl:h-[calc(100vh-40px)] xl:grid-rows-[auto_minmax(0,1fr)_auto]">
      {/* KPI strip: every figure belongs to the moment shown, except the month projection */}
      <div className="xl:col-span-2 flex flex-wrap border-b border-panel-seam">
        <Kpi label="Incomer" value={fmt(snap.total_kw)} unit="kW" />
        <Kpi label="Into empty rooms" value={fmt(snap.waste_kw)} unit="kW" tone={snap.waste_kw > 0 ? 'waste' : undefined} />
        <Kpi label={at ? `${replayDay} to ${momentTime}` : 'Today so far'} value={fmt(dayKwh, 1)} unit="kWh" />
        <Kpi label={at ? 'This month · live' : 'This month (proj.)'} value={month ? month.projected_kwh.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'} unit="kWh" />
        <Kpi label="Ambient" value={snap.outdoor_temp_c.toFixed(1)} unit="°C" />
        <Kpi label="Devices on" value={`${snap.units_on}`} unit={`/ ${snap.units_total}`} />
        <div className="ml-auto px-5 py-2.5 text-right">
          <div className="text-[13px] font-semibold">{snap.floor?.building} · {snap.floor?.name}</div>
          <div className="text-xs text-panel-muted num">
            {at ? `Replaying ${momentDate} ${momentTime}` : `Live ${momentTime}`} · simulated
          </div>
        </div>
      </div>

      {/* Diagram */}
      <section className="min-h-0 overflow-auto px-4 pt-3 flex flex-col" aria-label="Single-line diagram">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="section-title">Single-line · {at ? 'replay' : 'live'}</h1>
          {at && (
            <button onClick={() => setParam('at', null)} className="flex items-center gap-1 text-xs text-panel-ink border border-panel-wire px-2 py-0.5 rounded-[2px] hover:border-accent hover:text-accent snap">
              <RotateCcw className="w-3 h-3" /> Back to live
            </button>
          )}
          {error && <span className="text-xs text-lamp-on">{error}</span>}
        </div>
        <div className="flex-1 min-h-0 flex items-center">
          <SingleLineDiagram snapshot={snap} selected={selected} onSelect={code => setParam('room', code === selected ? null : code)} />
        </div>
      </section>

      {/* Right column: act, then look ahead, then detail */}
      <aside className="xl:row-span-2 border-t xl:border-t-0 xl:border-l border-panel-seam min-h-0 overflow-y-auto">
        <div className="px-4 pt-3 pb-2 flex items-baseline justify-between">
          <h2 className="section-title">Into empty rooms · {waste.length}</h2>
          <span className="num text-xs text-waste">{fmt(snap.waste_kw)} kW</span>
        </div>
        {waste.length === 0 ? (
          <p className="px-4 pb-3 text-[13px] text-panel-muted">No power is going into empty rooms {at ? 'at this moment' : 'right now'}.</p>
        ) : (
          <ul>
            {waste.map(s => (
              <li key={s.space_id} className={`grid grid-cols-[10px_52px_minmax(0,1fr)_44px_auto] items-center gap-x-2 px-4 py-2 border-t border-panel-seam ${selected === s.code ? 'bg-panel-raised' : ''}`}>
                <span className="w-2 h-2 rounded-full bg-lamp-on" aria-hidden />
                <button className="num text-[13px] font-semibold text-left hover:underline underline-offset-4" onClick={() => setParam('room', s.code)}>{s.code}</button>
                <span className="min-w-0">
                  <span className="block text-xs truncate">{onSummary(s) || 'Standby loads'}</span>
                  <span className="block text-[11px] text-panel-muted leading-snug">
                    <span className="num">since {s.state_since ?? '—'}</span> · {SHORT_STATE[s.state] ?? STATE_LABEL[s.state].toLowerCase()}
                  </span>
                </span>
                <span className="num text-[13px] font-semibold text-waste text-right">{fmt(s.waste_kw)}</span>
                <button
                  disabled={!!at || busy === s.space_id}
                  onClick={() => act(s, () => pilot.cut(s.space_id))}
                  title={at ? 'Return to live to trip' : `Switch off ${s.code}'s controllable loads while it is empty today`}
                  className="ml-3 flex items-center gap-1.5 border border-panel-wire hover:border-accent hover:text-accent text-[11px] font-semibold tracking-[0.1em] px-2.5 py-1 rounded-[3px] snap disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Power className="w-3 h-3" /> TRIP
                </button>
              </li>
            ))}
          </ul>
        )}

        <section className="border-t border-panel-seam px-4 py-3" aria-label="Next on this floor">
          <h2 className="section-title mb-2">Next · from {momentTime}</h2>
          {nextEvents.length === 0 ? (
            <p className="text-[13px] text-panel-muted">
              Nothing else scheduled today. <Link to="/book" className="text-panel-ink underline underline-offset-4">Book an extra class</Link>
            </p>
          ) : (
            <ol className="space-y-2">
              {nextEvents.map(ev => (
                <li key={ev.time} className="grid grid-cols-[44px_minmax(0,1fr)] gap-2 text-xs">
                  <span className="num text-[13px] text-panel-ink">{ev.time}</span>
                  <span className="space-y-0.5">
                    {ev.starts.length > 0 && <span className="block"><span className="text-panel-muted">On </span><span className="num">{ev.starts.join(' · ')}</span></span>}
                    {ev.empties.length > 0 && <span className="block"><span className="text-panel-muted">Empties </span><span className="num">{ev.empties.join(' · ')}</span></span>}
                    {ev.extras.map(x => <span key={x} className="block">Extra class: {x}</span>)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {sel && (
          <section className="border-t border-panel-seam px-4 py-3" aria-label={`Feeder ${sel.code}`}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold num">{sel.code}</h2>
              <button onClick={() => setParam('room', null)} className="text-xs text-panel-muted hover:text-panel-ink">Close</button>
            </div>
            <p className="text-xs text-panel-muted">
              {sel.name} · {STATE_LABEL[sel.state]}
              {sel.label && sel.label !== STATE_LABEL[sel.state] ? ` · ${sel.label}` : ''}
              {sel.teacher ? ` · ${sel.teacher}` : ''}
              {sel.headcount ? ` · ~${sel.headcount} people` : ''}
            </p>
            <table className="w-full mt-2 text-xs">
              <thead>
                <tr className="text-panel-muted text-left">
                  <th className="font-medium py-1">Device</th>
                  <th className="font-medium py-1 text-right">On</th>
                  <th className="font-medium py-1 text-right">kW</th>
                </tr>
              </thead>
              <tbody>
                {sel.assets.map(a => (
                  <tr key={a.asset_id} className="border-t border-panel-seam">
                    <td className="py-1.5"><span className="inline-flex items-center gap-1.5"><CategoryDot category={a.category} />{a.name}</span><span className="text-panel-muted"> · {CATEGORY_LABEL[a.category]}{a.controllable ? '' : ' · always on'}</span></td>
                    <td className={`py-1.5 text-right num ${a.on_count ? 'text-panel-ink' : 'text-panel-muted'}`}>{a.on_count}/{a.quantity}</td>
                    <td className="py-1.5 text-right num">{a.kw.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-2 mt-3">
              {sel.cut_armed ? (
                <button disabled={!!at} onClick={() => act(sel, () => pilot.releaseCut(sel.space_id))} className="flex items-center gap-1.5 border border-panel-wire hover:border-accent hover:text-accent text-xs px-3 py-1 rounded-[3px] snap disabled:opacity-40">
                  <Undo2 className="w-3 h-3" /> Release trip
                </button>
              ) : (
                <button disabled={!!at || busy === sel.space_id} onClick={() => act(sel, () => pilot.cut(sel.space_id))} className="flex items-center gap-1.5 border border-panel-wire hover:border-accent hover:text-accent text-xs px-3 py-1 rounded-[3px] snap disabled:opacity-40">
                  <Power className="w-3 h-3" /> Trip while empty today
                </button>
              )}
              <Link to="/floors" className="text-xs text-panel-muted hover:text-panel-ink px-2 py-1">Edit devices</Link>
            </div>
          </section>
        )}
      </aside>

      {/* Ribbon */}
      <section className="border-t border-panel-seam px-4 py-2" aria-label="Floor load over the last 24 hours">
        <div className="flex items-center gap-4">
          <h2 className="section-title">Incomer kW · last 24 h</h2>
          <span className="flex items-center gap-1.5 text-xs text-panel-muted"><span className="w-4 h-0.5 bg-panel-ink" />Floor kW</span>
          <span className="flex items-center gap-1.5 text-xs text-panel-muted"><span className="w-3 h-2.5 bg-chart-saved" />Into empty rooms</span>
          <span className="ml-auto text-xs text-panel-muted">Click the chart to replay any moment</span>
        </div>
        <LoadRibbon points={series} at={snap.timestamp} onPick={t => setParam('at', t)} height={170} />
      </section>
    </div>
  );
};
