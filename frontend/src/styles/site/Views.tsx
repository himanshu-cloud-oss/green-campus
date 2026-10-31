import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ago, hw } from '../../services/hw';
import { STATE_LABEL, RoomState } from '../../services/pilot';
import { usePaths } from '../StyleContext';
import { useSite } from './data';
import { CommandPanel } from './Inspector';
import { Btn, Dot, Empty, FilterSelect, fmtTime, HEALTH_LABEL, kw, Notice, PriChip, SectionTitle, Td, Th } from './ui';

const Page: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> = ({ title, children, right }) => (
  <div className="flex-1 min-h-0 overflow-auto p-4 space-y-4">
    <div className="flex items-end justify-between gap-4">
      <h1 className="text-[17px] font-semibold">{title}</h1>
      {right}
    </div>
    {children}
  </div>
);

const NotInstrumented: React.FC = () => <Notice>This floor is not instrumented. Select the pilot floor in the site selector.</Notice>;

const Table: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
  <div className="rounded-[6px] border border-panel-seam bg-panel-raised overflow-x-auto">
    <table className="w-full border-collapse" aria-label={label}>{children}</table>
  </div>
);

/* ---------------------------------------------------------------- Rooms */

export const RoomsView: React.FC = () => {
  const { floor, floorIsPilot, readingOf, details, channels, healthOf, requestCmd, select, loading, cmd } = useSite();
  const nav = useNavigate();
  const p = usePaths();
  if (!floorIsPilot) return <Page title="Rooms"><NotInstrumented /></Page>;
  const open = (id: number) => { select(id); nav(p('/')); };
  return (
    <Page title="Rooms">
      {cmd && <CommandPanel />}
      {loading && !floor ? <Empty>Loading rooms...</Empty> : (
        <Table label="Rooms">
          <thead>
            <tr><Th>Room</Th><Th>Health</Th><Th>State</Th><Th className="text-right">kW</Th><Th className="text-right">Waste kW</Th><Th>Relays on</Th><Th>Last seen</Th><Th><span className="sr-only">Actions</span></Th></tr>
          </thead>
          <tbody>
            {(floor?.spaces ?? []).map(s => {
              const r = readingOf(s.id);
              const d = details[s.id];
              const chs = d?.relay_bank.channels ?? [];
              const on = chs.filter(c => c.command === 'ON');
              const rows = channels.filter(c => c.space_id === s.id);
              const total = chs.length || rows.length;
              const onN = chs.length ? on.length : rows.filter(c => c.command === 'ON').length;
              const seen = d ? Math.min(...d.sensors.map(x => x.last_seen_s), Infinity) : Infinity;
              const h = healthOf(s.id);
              const blocked = d?.interlock.active;
              return (
                <tr key={s.id} className="hover:bg-panel-seam">
                  <Td><span className="font-mono font-semibold">{s.code}</span> <span className="text-panel-muted">{s.name}</span></Td>
                  <Td><span className="inline-flex items-center gap-1.5"><Dot health={h} />{HEALTH_LABEL[h]}</span></Td>
                  <Td>{d?.label ?? r?.label ?? (r ? STATE_LABEL[r.state as RoomState] : '--')}</Td>
                  <Td className="text-right num font-mono">{kw(r?.kw ?? d?.kw)}</Td>
                  <Td className={`text-right num font-mono ${(r?.waste_kw ?? 0) > 0 ? 'text-waste' : ''}`}>{kw(r?.waste_kw ?? d?.waste_kw)}</Td>
                  <Td className="num">{total ? `${onN}/${total}` : '--'}</Td>
                  <Td className="num">{Number.isFinite(seen) ? `${ago(seen)} ago` : '--'}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <Btn small onClick={() => open(s.id)} aria-label={`Open ${s.code} in inspector`}>Inspect</Btn>{' '}
                    <Btn
                      small disabled={!d || on.length === 0 || !!blocked}
                      title={blocked ? d?.interlock.reason ?? 'Interlocked' : on.length === 0 ? 'All channels off' : undefined}
                      aria-label={`Switch off ${s.code}`}
                      onClick={() => requestCmd({ spaceId: s.id, code: s.code, state: 'OFF', channels: on.map(c => c.ch), labels: on.map(c => `${c.ch} ${c.load}`) })}
                    >Switch off</Btn>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Page>
  );
};

/* -------------------------------------------------------------- Devices */

const HEALTH_TONE: Record<string, string> = { OK: 'text-lamp-off', WASTE: 'text-waste', MISMATCH: 'text-lamp-on', STALE: 'text-panel-muted' };

export const DevicesView: React.FC = () => {
  const { channels, details, floorIsPilot, requestCmd, cmd, loading, floor } = useSite();
  const [chHealth, setChHealth] = useState('all');
  const [q, setQ] = useState('');
  const [sType, setSType] = useState('all');
  const [sStatus, setSStatus] = useState('all');

  const sensors = useMemo(() => Object.values(details).flatMap(d => d.sensors.map(s => ({ ...s, room: d.space.code, roomId: d.space.id }))), [details]);
  const chRows = channels.filter(c => (chHealth === 'all' || c.health === chHealth) && (!q || `${c.room} ${c.load} ${c.ch}`.toLowerCase().includes(q.toLowerCase())));
  const sRows = sensors.filter(s => (sType === 'all' || s.type === sType) && (sStatus === 'all' || s.status === sStatus) && (!q || `${s.room} ${s.id}`.toLowerCase().includes(q.toLowerCase())));

  if (!floorIsPilot) return <Page title="Devices"><NotInstrumented /></Page>;
  return (
    <Page
      title="Devices"
      right={
        <input
          value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by room or device" aria-label="Filter devices"
          className="bg-panel-raised border border-panel-wire rounded-[6px] px-2.5 py-1.5 text-xs w-56 placeholder:text-panel-muted"
        />
      }
    >
      {cmd && <CommandPanel />}
      <section>
        <SectionTitle right={<FilterSelect label="Health" value={chHealth} onChange={setChHealth} options={[['all', 'All'], ['OK', 'OK'], ['WASTE', 'Waste'], ['MISMATCH', 'Mismatch'], ['STALE', 'Stale']]} />}>
          Relay channels ({chRows.length})
        </SectionTitle>
        {loading && channels.length === 0 ? <Empty>Loading channels...</Empty> : chRows.length === 0 ? <Empty>No channels match.</Empty> : (
          <Table label="Relay channels">
            <thead><tr><Th>Room</Th><Th>Ch</Th><Th>Load</Th><Th>Command</Th><Th>Feedback</Th><Th className="text-right">kW</Th><Th>Health</Th><Th>Rule</Th><Th><span className="sr-only">Actions</span></Th></tr></thead>
            <tbody>
              {chRows.map(c => (
                <tr key={`${c.space_id}-${c.ch}`} className="hover:bg-panel-seam">
                  <Td className="font-mono">{c.room}</Td>
                  <Td className="font-mono">{c.ch}</Td>
                  <Td>{c.load}</Td>
                  <Td className="font-mono">{c.command}</Td>
                  <Td className={`font-mono ${c.command !== c.feedback ? 'text-waste' : ''}`}>{c.feedback}</Td>
                  <Td className="text-right num font-mono">{kw(c.kw)}</Td>
                  <Td className={`font-semibold ${HEALTH_TONE[c.health]}`}>{c.health}</Td>
                  <Td className="text-panel-muted">{c.rule}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <Btn small disabled={c.command === 'ON'} aria-label={`Switch ${c.room} ${c.ch} on`}
                      onClick={() => requestCmd({ spaceId: c.space_id, code: c.room, state: 'ON', channels: [c.ch], labels: [`${c.ch} ${c.load}`] })}>On</Btn>{' '}
                    <Btn small disabled={c.command === 'OFF'} aria-label={`Switch ${c.room} ${c.ch} off`}
                      onClick={() => requestCmd({ spaceId: c.space_id, code: c.room, state: 'OFF', channels: [c.ch], labels: [`${c.ch} ${c.load}`] })}>Off</Btn>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
      <section>
        <SectionTitle right={
          <div className="flex gap-3">
            <FilterSelect label="Type" value={sType} onChange={setSType} options={[['all', 'All'], ['OCCUPANCY', 'Occupancy'], ['POWER', 'Power']]} />
            <FilterSelect label="Status" value={sStatus} onChange={setSStatus} options={[['all', 'All'], ['ONLINE', 'Online'], ['STALE', 'Stale'], ['LOW_BATTERY', 'Low battery']]} />
          </div>
        }>Sensors ({sRows.length})</SectionTitle>
        {Object.keys(details).length === 0 && floor ? <Empty>Loading sensors...</Empty> : sRows.length === 0 ? <Empty>No sensors match.</Empty> : (
          <Table label="Sensors">
            <thead><tr><Th>Sensor</Th><Th>Type</Th><Th>Room</Th><Th>Reading</Th><Th className="text-right">Battery</Th><Th className="text-right">Last seen</Th><Th>Status</Th></tr></thead>
            <tbody>
              {sRows.map(s => (
                <tr key={s.id} className="hover:bg-panel-seam">
                  <Td className="font-mono">{s.id}</Td>
                  <Td>{s.type === 'OCCUPANCY' ? 'Occupancy (PIR)' : 'Power (CT)'}</Td>
                  <Td className="font-mono">{s.room}</Td>
                  <Td className="num">{s.reading}{s.amps != null ? ` · ${s.amps.toFixed(1)} A` : ''}</Td>
                  <Td className={`text-right num ${s.status === 'LOW_BATTERY' ? 'text-waste' : ''}`}>{s.battery_pct != null ? `${s.battery_pct}%` : '--'}</Td>
                  <Td className="text-right num">{ago(s.last_seen_s)} ago</Td>
                  <Td className={s.status === 'ONLINE' ? 'text-lamp-off' : s.status === 'STALE' ? 'text-panel-muted' : 'text-waste'}>{s.status.replace('_', ' ')}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </Page>
  );
};

/* --------------------------------------------------------------- Alarms */

export const AlarmsView: React.FC = () => {
  const { alarms, tasks, refresh, floorIsPilot, loading } = useSite();
  const [pri, setPri] = useState('all');
  const [ackF, setAckF] = useState('open');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rows = alarms.filter(a => (pri === 'all' || a.priority === pri) && (ackF === 'all' || (ackF === 'open' ? !a.acked : a.acked)));
  const ackable = rows.filter(a => !a.acked);
  const picked = ackable.filter(a => sel.has(a.key));

  if (!floorIsPilot) return <Page title="Alarms"><NotInstrumented /></Page>;

  const toggle = (k: string) => setSel(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const ackKeys = async (keys: string[]) => {
    setBusy(true); setErr(null);
    const res = await Promise.allSettled(keys.map(k => hw.ack(k)));
    if (res.some(r => r.status === 'rejected')) setErr('Some alarms could not be acknowledged.');
    setSel(new Set()); setBusy(false); refresh();
  };

  return (
    <Page title="Alarms" right={
      <div className="flex items-center gap-3">
        <FilterSelect label="Priority" value={pri} onChange={setPri} options={[['all', 'All'], ['P1', 'P1'], ['P2', 'P2'], ['P3', 'P3']]} />
        <FilterSelect label="State" value={ackF} onChange={setAckF} options={[['open', 'Unacknowledged'], ['acked', 'Acknowledged'], ['all', 'All']]} />
        <Btn small disabled={picked.length === 0 || busy} onClick={() => ackKeys(picked.map(a => a.key))}>Acknowledge selected ({picked.length})</Btn>
        <Btn small disabled={ackable.length === 0 || busy} onClick={() => ackKeys(ackable.map(a => a.key))}>Acknowledge all shown</Btn>
      </div>
    }>
      {err && <Notice tone="error">{err}</Notice>}
      {loading && alarms.length === 0 ? <Empty>Loading alarms...</Empty> : rows.length === 0 ? <Empty>No alarms match these filters.</Empty> : (
        <Table label="Alarms">
          <thead><tr>
            <Th className="w-8">
              <input type="checkbox" aria-label="Select all unacknowledged alarms shown" checked={ackable.length > 0 && picked.length === ackable.length}
                onChange={e => setSel(e.target.checked ? new Set(ackable.map(a => a.key)) : new Set())} />
            </Th>
            <Th>Pri</Th><Th>Time</Th><Th>Object</Th><Th className="w-full">Message</Th><Th>Acknowledged</Th>
          </tr></thead>
          <tbody>
            {rows.map(a => (
              <tr key={a.key} className={a.acked ? 'opacity-50' : 'hover:bg-panel-seam'}>
                <Td><input type="checkbox" disabled={a.acked} checked={sel.has(a.key)} onChange={() => toggle(a.key)} aria-label={`Select alarm ${a.object}: ${a.message}`} /></Td>
                <Td><PriChip priority={a.priority} /></Td>
                <Td className="num font-mono">{fmtTime(a.time)}</Td>
                <Td className="font-mono">{a.object}</Td>
                <Td className="text-[13px]">{a.message}</Td>
                <Td className="whitespace-nowrap num">{a.acked ? `${fmtTime(a.acked_at)}${a.acked_by ? ` by ${a.acked_by}` : ''}` : '--'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <section>
        <SectionTitle>Task history</SectionTitle>
        {tasks.length === 0 ? <Empty>No tasks recorded.</Empty> : (
          <Table label="Task history">
            <thead><tr><Th className="w-16">Time</Th><Th>Target</Th><Th>Task</Th><Th>User</Th><Th>Status</Th><Th className="text-right">Result</Th></tr></thead>
            <tbody>
              {tasks.map((t, i) => (
                <tr key={i} className="hover:bg-panel-seam">
                  <Td className="num font-mono w-16 whitespace-nowrap">{fmtTime(t.time)}</Td>
                  <Td className="font-mono whitespace-nowrap">{t.target}</Td>
                  <Td className="max-w-[320px] truncate" title={t.task}>{t.task}</Td>
                  <Td className="whitespace-nowrap">{t.user}</Td>
                  <Td className={`whitespace-nowrap ${t.status === 'OK' ? 'text-lamp-off' : t.status === 'WARN' ? 'text-waste' : 'text-lamp-on'}`}>{t.status}</Td>
                  <Td className="text-panel-muted text-right max-w-[320px] truncate" title={t.result}>{t.result}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </Page>
  );
};
