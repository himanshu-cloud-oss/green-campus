import React, { useEffect, useMemo, useState } from 'react';
import { Power } from 'lucide-react';
import { useAlerts } from '../hooks/useAlerts';
import { useSimulations } from '../hooks/useSimulations';
import { AlertCard, ALERT_GRID } from '../components/alerts/AlertCard';
import { CountdownTimer } from '../components/alerts/CountdownTimer';
import { api } from '../services/api';
import { Alert, Classroom, PeriodDefinition } from '../types';
import { STANDARD_PERIODS } from '../utils/timeUtils';

const FILTERS: { id: Alert['severity'] | 'ALL' | 'OPEN'; label: string }[] = [
  { id: 'OPEN', label: 'Open' },
  { id: 'ALL', label: 'All' },
  { id: 'CRITICAL', label: 'Critical' },
  { id: 'WARNING', label: 'Warning' },
  { id: 'INFO', label: 'Info' },
  { id: 'RESOLVED', label: 'Resolved' },
];

const chip = (on: boolean) =>
  `text-xs px-2.5 py-1 rounded-[3px] border snap ${on ? 'border-panel-ink bg-panel-seam text-panel-ink' : 'border-panel-seam text-panel-muted hover:border-panel-wire'}`;

export const AlertsEvents: React.FC = () => {
  const { alerts, openCount, unreadCount, isLoading, error, acknowledgeAlert, resolveAlert, deleteAlert, refetch } = useAlerts();
  const { pendingSimulations, triggerNoShow, cancelSimulation, executeSimulation } = useSimulations();
  const [periods, setPeriods] = useState<PeriodDefinition[]>(STANDARD_PERIODS);
  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('OPEN');
  const [query, setQuery] = useState('');
  const [testRoom, setTestRoom] = useState<number | null>(null);
  const [testPeriod, setTestPeriod] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.listClassrooms().then(r => { setRooms(r); setTestRoom(t => t ?? r[0]?.id ?? null); }).catch(() => undefined);
    api.getPeriods().then(setPeriods).catch(() => undefined);
  }, []);
  const teaching = periods.filter(p => !p.is_break);
  const period = teaching.find(p => p.period_number === testPeriod) ?? teaching[0];

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return alerts.filter(a => {
      if (filter === 'OPEN' && a.severity === 'RESOLVED') return false;
      if (filter !== 'OPEN' && filter !== 'ALL' && a.severity !== filter) return false;
      if (!q) return true;
      return [a.title, a.message, a.classroom_name ?? ''].some(t => t.toLowerCase().includes(q));
    });
  }, [alerts, filter, query]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      await refetch();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <h1 className="text-[17px] font-semibold">Alerts</h1>
          <p className="text-xs text-panel-muted max-w-xl">
            What the backend has logged: no-show tests, the cut-offs they lead to, and system notices.
            No occupancy sensors are installed, so a no-show is only ever started by hand, below.
          </p>
        </div>
        <dl className="flex gap-6 text-xs">
          <div><dt className="section-title">Open</dt><dd className="num text-[15px] font-semibold">{openCount}</dd></div>
          <div><dt className="section-title">Not acknowledged</dt><dd className="num text-[15px] font-semibold">{unreadCount}</dd></div>
          <div><dt className="section-title">Cut-offs pending</dt><dd className="num text-[15px] font-semibold">{pendingSimulations.length}</dd></div>
        </dl>
      </div>

      {pendingSimulations.length > 0 && (
        <section className="border border-panel-seam" aria-label="Cut-offs counting down">
          <h2 className="section-title px-4 pt-2.5 pb-2">Cut-offs counting down · {pendingSimulations.length}</h2>
          <ul>
            {pendingSimulations.map(sim => (
              <li key={sim.id} className="grid grid-cols-[10px_64px_minmax(0,1fr)_auto] sm:grid-cols-[10px_64px_minmax(0,1fr)_88px_auto] items-center gap-x-3 gap-y-1 px-4 py-2 border-t border-panel-seam">
                <span className="w-2 h-2 rounded-full bg-lamp-on" title="Energised until the cut-off runs" aria-hidden />
                <span className="num text-[13px] font-semibold">{sim.classroom_name}</span>
                <span className="text-xs min-w-0">
                  <span className="block truncate">No-show test · {sim.period_label}</span>
                  <span className="sm:hidden text-[11px] text-panel-muted">cuts off in <CountdownTimer scheduledActionAt={sim.scheduled_action_at} /></span>
                </span>
                <span className="hidden sm:block text-right text-[13px]"><CountdownTimer scheduledActionAt={sim.scheduled_action_at} /></span>
                <span className="flex items-center gap-3 justify-end">
                  <button
                    disabled={busy}
                    onClick={() => run(() => executeSimulation(sim.id))}
                    className="flex items-center gap-1.5 border border-panel-wire hover:border-panel-ink text-[11px] font-semibold tracking-[0.1em] px-2.5 py-1 rounded-[3px] snap disabled:opacity-40"
                  >
                    <Power className="w-3 h-3" strokeWidth={1.6} /> CUT NOW
                  </button>
                  <button disabled={busy} onClick={() => run(() => cancelSimulation(sim.id))} className="text-xs text-panel-muted hover:text-panel-ink snap">
                    Cancel
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="border border-panel-seam px-4 py-3" aria-label="Test a no-show">
        <h2 className="section-title mb-2">Test a no-show</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label>
            <span className="label">Room</span>
            <select className="field num !w-auto" value={testRoom ?? ''} onChange={e => setTestRoom(Number(e.target.value))}>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Period</span>
            <select className="field num !w-auto" value={period?.period_number ?? ''} onChange={e => setTestPeriod(e.target.value)}>
              {teaching.map(p => <option key={p.period_number} value={p.period_number}>P{p.period_number} · {p.start_time}–{p.end_time}</option>)}
            </select>
          </label>
          <button
            disabled={busy || testRoom === null || !period}
            onClick={() =>
              period && testRoom !== null &&
              run(() => triggerNoShow(testRoom, `Period ${period.period_number}`, period.start_time, period.end_time))
            }
            className="text-xs border border-panel-wire hover:border-panel-ink px-3 py-1.5 rounded-[3px] snap disabled:opacity-40"
          >
            Start test
          </button>
          <p className="text-xs text-panel-muted max-w-md basis-full sm:basis-auto">
            Logs a warning and starts the cut-off countdown set in Settings, the way a detected no-show would be handled.
          </p>
        </div>
        {actionError && <p className="text-xs text-lamp-on mt-2">{actionError}</p>}
      </section>

      <section className="border border-panel-seam" aria-label="Alert log">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
          <h2 className="section-title mr-1">Log · {shown.length}</h2>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by state">
            {FILTERS.map(f => (
              <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={chip(filter === f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <label className="sm:ml-auto w-full sm:w-56">
            <span className="sr-only">Search alerts</span>
            <input type="search" className="field !py-1" placeholder="Search title, message or room" value={query} onChange={e => setQuery(e.target.value)} />
          </label>
          {error && <span className="text-xs text-lamp-on basis-full">{error}</span>}
        </div>

        <div className={`hidden lg:grid ${ALERT_GRID} gap-x-3 px-4 py-1.5 border-t border-panel-seam text-[11px] text-panel-muted`}>
          <span>Severity</span>
          <span>Event</span>
          <span>Room</span>
          <span>Logged</span>
          <span>State</span>
          <span />
        </div>

        {isLoading && alerts.length === 0 ? (
          <div className="border-t border-panel-seam bg-panel-raised/40 h-40" aria-busy="true" aria-label="Loading alerts" />
        ) : shown.length === 0 ? (
          <p className="border-t border-panel-seam px-4 py-6 text-[13px] text-panel-muted">
            {error
              ? 'The backend is not reachable, so no alerts can be shown.'
              : alerts.length === 0
              ? 'Nothing has been logged yet.'
              : filter === 'OPEN' && !query
              ? 'No open alerts. Everything logged has been resolved.'
              : 'No alerts match this filter.'}
          </p>
        ) : (
          <ul>
            {shown.map(a => (
              <AlertCard key={a.id} alert={a} onAcknowledge={acknowledgeAlert} onResolve={resolveAlert} onDelete={deleteAlert} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
