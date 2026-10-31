import React from 'react';
import { X } from 'lucide-react';
import { ago } from '../../services/hw';
import { STATE_LABEL, RoomState } from '../../services/pilot';
import { useSite } from './data';
import { Btn, Dot, fmtTime, HEALTH_LABEL, kw, Notice, SectionTitle, Switch, Td, Th } from './ui';

/** Inline confirmation / result strip for relay commands. Not a modal. */
export const CommandPanel: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { cmd, confirmCmd, dismissCmd } = useSite();
  const ref = React.useRef<HTMLDivElement>(null);
  const has = !!cmd;
  React.useEffect(() => {
    if (has) { ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); ref.current?.focus({ preventScroll: true }); }
  }, [has]);
  if (!cmd) return null;
  const { req, status } = cmd;
  const what = `${req.state} ${req.labels.join(', ')} in ${req.code}`;
  return (
    <div ref={ref} tabIndex={-1} role="status" aria-live="polite" className={`outline-none rounded-[6px] border border-panel-wire bg-panel-raised p-3 text-[13px] ${className}`}>
      {status.kind === 'confirm' && (
        <>
          <p>Switch <b>{req.state}</b> {req.channels.length} channel{req.channels.length === 1 ? '' : 's'} in <b className="font-mono">{req.code}</b>: {req.labels.join(', ')}.</p>
          <div className="flex gap-2 mt-2">
            <Btn kind="primary" small onClick={() => confirmCmd(false)}>Confirm {req.state === 'OFF' ? 'switch off' : 'switch on'}</Btn>
            <Btn small onClick={dismissCmd}>Cancel</Btn>
          </div>
        </>
      )}
      {status.kind === 'running' && <p className="text-panel-muted">Sending: {what}</p>}
      {status.kind === 'blocked' && (
        <>
          <p className="text-waste font-semibold">Blocked: {status.reason}</p>
          <p className="text-xs text-panel-muted mt-1">{what} was not sent. Overriding bypasses the timetable interlock and is logged.</p>
          <div className="flex gap-2 mt-2">
            <Btn small onClick={() => confirmCmd(true)}>Override interlock</Btn>
            <Btn small onClick={dismissCmd}>Cancel</Btn>
          </div>
        </>
      )}
      {status.kind === 'done' && (
        <>
          <p><span className={status.task.status === 'OK' ? 'text-lamp-off' : 'text-waste'}>{status.task.status}</span> · {status.task.task} · {status.task.result}</p>
          <div className="mt-2"><Btn small onClick={dismissCmd}>Dismiss</Btn></div>
        </>
      )}
      {status.kind === 'error' && (
        <>
          <p className="text-lamp-on">{status.message}</p>
          <div className="mt-2"><Btn small onClick={dismissCmd}>Dismiss</Btn></div>
        </>
      )}
    </div>
  );
};

const Row: React.FC<{ k: string; children: React.ReactNode }> = ({ k, children }) => (
  <div className="flex items-baseline justify-between gap-4 py-1 text-[13px]">
    <dt className="text-panel-muted shrink-0">{k}</dt>
    <dd className="text-right min-w-0">{children}</dd>
  </div>
);

export const Inspector: React.FC = () => {
  const { selectedId, select, spaceById, readingOf, details, healthOf, requestCmd, cmd, tasks } = useSite();
  if (selectedId == null) {
    return (
      <aside className="w-[360px] shrink-0 border-l border-panel-seam bg-panel-ground p-4" aria-label="Inspector">
        <SectionTitle>Inspector</SectionTitle>
        <p className="text-[13px] text-panel-muted">Select a room on the map to see its sensors, relay channels and recent commands.</p>
      </aside>
    );
  }
  const space = spaceById(selectedId);
  const d = details[selectedId];
  const r = readingOf(selectedId);
  const health = healthOf(selectedId);
  const code = space?.code ?? d?.space.code ?? '';
  const pir = d?.sensors.find(s => s.type === 'OCCUPANCY');
  const ct = d?.sensors.find(s => s.type === 'POWER');
  const state = d?.label ?? r?.label ?? STATE_LABEL[(d?.state ?? r?.state) as RoomState] ?? '--';
  const next = d?.timetable_now ?? d?.next_event;
  const on = (d?.relay_bank.channels ?? []).filter(c => c.command === 'ON');
  const interlocked = d?.interlock.active ?? false;
  const wasting = (d?.waste_kw ?? r?.waste_kw ?? 0) > 0;
  const switchable = on.map(c => c.ch);
  let reason: string | null = null;
  if (!d) reason = 'Waiting for room data';
  else if (interlocked) reason = d.interlock.reason ?? 'Class in session, trip blocked';
  else if (switchable.length === 0) reason = 'All channels are already off';
  else if (!wasting) reason = 'Room is occupied or in a booked period';
  const roomTasks = tasks.filter(t => code && t.target.split(/[\s/·,]+/).some(x => x === code || x.endsWith(code))).slice(0, 5);
  const mine = cmd && cmd.req.spaceId === selectedId;

  return (
    <aside className="w-[360px] shrink-0 border-l border-panel-seam bg-panel-ground overflow-y-auto" aria-label="Inspector">
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-panel-muted">
              <span className="font-mono">{code}</span> · {(space?.kind ?? d?.space.kind ?? '').replace('_', ' ')}
            </h2>
            <p className="text-[15px] font-semibold mt-0.5">{space?.name ?? d?.space.name}</p>
          </div>
          <button type="button" aria-label="Close inspector" onClick={() => select(null)} className="p-1 rounded-[6px] text-panel-muted hover:bg-panel-seam">
            <X className="w-4 h-4" strokeWidth={1.8} />
          </button>
        </div>

        <dl className="rounded-[6px] border border-panel-seam bg-panel-raised px-3 py-1.5">
          <Row k="State"><Dot health={health} className="mr-1.5" />{state}</Row>
          <Row k="Health">{HEALTH_LABEL[health]}</Row>
          <Row k="Occupancy">
            {pir ? <><span className="font-mono">{pir.id}</span> · {pir.reading} · {ago(pir.last_seen_s)} ago</> : '--'}
          </Row>
          <Row k="Power">
            <span className="num font-mono">{kw(d?.kw ?? r?.kw)} kW</span>
            {ct?.amps != null && <span className="num font-mono"> · {ct.amps.toFixed(1)} A</span>}
          </Row>
          <Row k="Next class">{next ? <><span className="num">{fmtTime(next.start)}</span> · {next.subject}</> : 'None today'}</Row>
          <Row k="Interlock">{interlocked ? <span className="text-waste">{d?.interlock.reason ?? 'Active'}</span> : 'Clear'}</Row>
        </dl>

        <section className="rounded-[6px] border border-panel-seam bg-panel-raised">
          <div className="px-3 pt-2.5 pb-1 text-[13px] font-semibold">
            Relays · <span className="font-mono">{d?.relay_bank.id ?? '--'}</span>
          </div>
          {!d && <p className="px-3 pb-3 text-[13px] text-panel-muted">Loading channels...</p>}
          <ul>
            {d?.relay_bank.channels.map(c => {
              const confirmed = c.command === c.feedback;
              return (
                <li key={c.ch} className="flex items-center gap-3 px-3 py-2 border-t border-panel-seam text-[13px]">
                  <span className="font-mono text-xs w-6 shrink-0">{c.ch}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{c.load}</span>
                    <span className={`block font-mono text-[11px] ${confirmed ? 'text-panel-muted' : 'text-waste'}`}>
                      {c.command} · {confirmed ? 'confirmed' : 'no feedback'}
                    </span>
                  </span>
                  <span className="num font-mono text-xs text-panel-muted shrink-0">{c.measured_kw.toFixed(2)} kW</span>
                  <Switch
                    checked={c.command === 'ON'}
                    label={`${c.load} relay ${c.ch}, currently ${c.command}`}
                    onChange={() => requestCmd({ spaceId: selectedId, code, state: c.command === 'ON' ? 'OFF' : 'ON', channels: [c.ch], labels: [`${c.ch} ${c.load}`] })}
                  />
                </li>
              );
            })}
          </ul>
          {d && d.unswitched.length > 0 && (
            <p className="px-3 py-2 border-t border-panel-seam text-xs text-panel-muted">
              Not on a relay: {d.unswitched.map(u => `${u.name} ×${u.quantity}`).join(', ')}
            </p>
          )}
        </section>

        {mine && <CommandPanel />}

        <div>
          <Btn
            kind="primary" className="w-full" disabled={reason != null || !!mine}
            onClick={() => requestCmd({
              spaceId: selectedId, code, state: 'OFF', channels: switchable,
              labels: on.map(c => `${c.ch} ${c.load}`),
            })}
          >
            Switch off unoccupied loads ({switchable.length} ch)
          </Btn>
          <p className="text-xs text-panel-muted mt-1.5">
            {reason ?? 'Command is confirmed by relay feedback and CT reading; unconfirmed channels raise an alarm.'}
          </p>
        </div>

        <section>
          <SectionTitle>Recent tasks</SectionTitle>
          {roomTasks.length === 0 ? <p className="text-[13px] text-panel-muted">No commands sent to this room.</p> : (
            <table className="w-full border-collapse">
              <thead><tr><Th className="px-0 w-12">Time</Th><Th>Task</Th><Th className="text-right">Result</Th></tr></thead>
              <tbody>
                {roomTasks.map((t, i) => (
                  <tr key={i}>
                    <Td className="px-0 num font-mono w-12 whitespace-nowrap">{fmtTime(t.time)}</Td>
                    <Td className="max-w-[150px] truncate" title={t.task}>{t.task}</Td>
                    <Td className={`text-right whitespace-nowrap ${t.status === 'OK' ? 'text-panel-muted' : t.status === 'WARN' ? 'text-waste' : 'text-lamp-on'}`}>{t.result}</Td>
                  </tr>
                ))}
                </tbody>
            </table>
          )}
        </section>
        {!space && !d && <Notice>Room data unavailable.</Notice>}
      </div>
    </aside>
  );
};
