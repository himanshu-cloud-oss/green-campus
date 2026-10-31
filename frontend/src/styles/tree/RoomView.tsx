import React, { useMemo } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ago, hw, HwChannel, HwSpace } from '../../services/hw';
import { BookingRecord, pilot, errorMessage, STATE_LABEL, RoomState, Space, TimetableSlot } from '../../services/pilot';
import { CategoryChip } from '../../components/ui/CategoryChip';
import { alpha, useTheme } from '../../theme';
import { useTree, usePoll } from './data';
import { useSwitcher } from './switching';
import { AlarmTable, SensorTable } from './tables';
import { TaskTable } from './Dock';
import { Btn, Dot, Empty, ErrorNote, KV, Loading, ObjectHeader, OnOffChip, Panel, Seg, StatusText, TD, TDR, TH, THR, Tabs, Tone, hhmm, hhmmss, shortName } from './ui';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_NAME: Record<string, string> = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday' };
const WEEKDAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const CH_STATUS: Record<HwChannel['status'], { tone: Tone; text: string }> = {
  OK: { tone: 'ok', text: 'OK' },
  MISMATCH: { tone: 'bad', text: 'No feedback' },
  OFF: { tone: 'idle', text: 'Off' },
};

function useRoomSchedule(classroomId: number | null, date: string | null) {
  const week = usePoll(async () => {
    if (classroomId == null) return null;
    const all = await Promise.all(DAYS.map(d => pilot.timetable(d)));
    return DAYS.map((d, i) => ({ day: d, slots: all[i].filter(s => s.classroom_id === classroomId).sort((a, b) => a.start_time.localeCompare(b.start_time)) }));
  }, [classroomId], { ms: 0 });
  const bookings = usePoll(async () => {
    if (classroomId == null || !date) return null;
    return (await pilot.bookings({ date })).filter(b => b.classroom_id === classroomId && b.status !== 'CANCELLED');
  }, [classroomId, date], { ms: 30000 });
  return { week, bookings };
}

const stateText = (state: string, label: string | null) =>
  STATE_LABEL[state as RoomState] ?? (label && !/^[A-Z_]+$/.test(label) ? label : state.replace(/_/g, ' ').toLowerCase());

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const START = 6 * 60;
const END = 22 * 60;

const TodayStrip: React.FC<{ slots: TimetableSlot[]; bookings: BookingRecord[]; nowHHMM: string }> = ({ slots, bookings, nowHHMM }) => {
  const { p } = useTheme();
  const pos = (m: number) => `${(Math.min(Math.max(m, START), END) - START) / (END - START) * 100}%`;
  const seg = (s: string, e: string) => ({ left: pos(mins(s)), width: `${(Math.min(mins(e), END) - Math.max(mins(s), START)) / (END - START) * 100}%` });
  const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22];
  return (
    <div aria-label="Today's schedule">
      <div className="relative h-7 border border-panel-seam rounded-[3px] bg-panel-ground overflow-hidden">
        {slots.map(s => (
          <div key={s.id} className="absolute top-0 bottom-0" style={{ ...seg(s.start_time, s.end_time), background: alpha(p.accent, 0.3), borderLeft: `2px solid ${p.accent}` }} title={`${hhmm(s.start_time)}-${hhmm(s.end_time)} ${s.subject} (${s.section})`} />
        ))}
        {bookings.map(b => (
          <div key={b.id} className="absolute top-0 bottom-0" style={{ ...seg(b.start_time, b.end_time), background: alpha(p.waste, 0.3), borderLeft: `2px solid ${p.waste}` }} title={`${hhmm(b.start_time)}-${hhmm(b.end_time)} ${b.subject} (booking)`} />
        ))}
        <div className="absolute top-0 bottom-0 w-px" style={{ left: pos(mins(nowHHMM)), background: p.ink }} aria-hidden />
      </div>
      <div className="relative h-4 mt-1 text-[11px] text-panel-muted num">
        {hours.map(h => <span key={h} className="absolute -translate-x-1/2" style={{ left: pos(h * 60) }}>{String(h).padStart(2, '0')}</span>)}
      </div>
      <div className="flex gap-4 mt-2 text-xs text-panel-muted">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: alpha(p.accent, 0.3), border: `1px solid ${p.accent}` }} />Timetable</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: alpha(p.waste, 0.3), border: `1px solid ${p.waste}` }} />Extra booking</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-px h-3" style={{ background: p.ink }} />Now {nowHHMM}</span>
      </div>
    </div>
  );
};

const clock = (s: string) => (s.includes('T') ? s.slice(11, 16) : s.slice(0, 5));
const evText = (e: NonNullable<HwSpace['timetable_now']>) => `${e.subject} · ${clock(e.start)}-${clock(e.end)}${e.section ? ` (${e.section})` : ''}`;

export const RoomView: React.FC = () => {
  const { spaceId, tab = 'summary' } = useParams();
  const id = Number(spaceId);
  const { spaceById, spaces, health, version, loading: treeLoading } = useTree();
  const inv = spaceById(id);
  const navigate = useNavigate();
  const sw = useSwitcher();
  const sp = usePoll(() => hw.space(id), [id], { signal: version });
  const d = sp.data;
  const sched = useRoomSchedule(inv?.classroom_id ?? null, d ? d.at.slice(0, 10) : null);

  if (!treeLoading && spaces.length > 0 && !inv) return <Navigate to="/tree" replace />;
  if (!inv) return <div className="p-4"><Loading what="room" /></div>;

  const base = `/tree/room/${id}`;
  const tabs = [
    { id: 'summary', label: 'Summary', to: base },
    { id: 'relays', label: 'Relays', to: `${base}/relays` },
    { id: 'sensors', label: 'Sensors', to: `${base}/sensors` },
    { id: 'schedule', label: 'Schedule', to: `${base}/schedule` },
    { id: 'inventory', label: 'Inventory', to: `${base}/inventory` },
    { id: 'history', label: 'History', to: `${base}/history` },
  ];
  const current = tabs.some(t => t.id === tab) ? tab : 'summary';
  const h = health(id);
  const chans = d?.relay_bank.channels ?? [];
  const onCh = chans.filter(c => c.command === 'ON');
  const offCh = chans.filter(c => c.command === 'OFF');
  const items = (cs: HwChannel[]) => cs.map(c => ({ ch: c.ch, load: c.load }));

  let wasteMin: number | null = null;
  if (d && d.waste_kw > 0) {
    const m = Math.round((new Date(d.at).getTime() - new Date(d.state_since).getTime()) / 60000);
    wasteMin = Number.isFinite(m) && m >= 0 ? m : null;
  }
  const statusText = d
    ? d.waste_kw > 0
      ? `Unoccupied and powered · ${d.waste_kw.toFixed(2)} kW${wasteMin != null ? ` for ${wasteMin} min` : ''}`
      : stateText(d.state, d.label)
    : sp.error ? 'Status unavailable' : 'Loading status';

  return (
    <div>
      <ObjectHeader
        crumbs={<Link to="/tree" className="hover:underline">{inv.kind.replace('_', ' ').toLowerCase()}</Link>}
        title={<><span className="num">{inv.code}</span>{shortName(inv.code, inv.name) ? ` · ${shortName(inv.code, inv.name)}` : ''}</>}
        status={<><Dot tone={h.tone} /><span>{statusText}</span></>}
        actions={
          <>
            <Btn onClick={() => navigate(`${base}/schedule`)}>Schedule</Btn>
            <Btn disabled={offCh.length === 0 || sw.busy} onClick={() => sw.request('ON', [{ spaceId: id, room: inv.code, items: items(offCh) }])}>Restore</Btn>
            <Btn kind="primary" disabled={onCh.length === 0 || sw.busy} onClick={() => sw.request('OFF', [{ spaceId: id, room: inv.code, items: items(onCh) }])}>Switch off unoccupied loads</Btn>
          </>
        }
      />
      {sw.bar}
      <div className="px-4 mt-1"><Tabs tabs={tabs} current={current} /></div>

      {!!sp.error && !d && <div className="p-4"><ErrorNote message={`Room telemetry unavailable: ${errorMessage(sp.error)}`} /></div>}
      {!d && !sp.error && <div className="p-4"><Loading what="room telemetry" /></div>}

      {d && current === 'summary' && <RoomSummary d={d} inv={inv} sched={sched} />}
      {d && current === 'relays' && <RoomRelays d={d} request={sw.request} busy={sw.busy} code={inv.code} id={id} onCh={onCh} offCh={offCh} items={items} />}
      {d && current === 'sensors' && (
        <div className="p-4">
          <Panel title={`Sensors · ${d.sensors.length}`} flush>
            {d.sensors.length === 0 ? <Empty>No sensors are registered for this room.</Empty>
              : <div className="overflow-x-auto"><SensorTable showRoom={false} rows={d.sensors.map(s => ({ room: inv.code, spaceId: id, sensor: s }))} /></div>}
          </Panel>
        </div>
      )}
      {current === 'schedule' && <RoomSchedule inv={inv} sched={sched} today={d ? WEEKDAY[new Date(d.at.slice(0, 10) + 'T00:00:00').getDay()] : null} />}
      {current === 'inventory' && <RoomInventory inv={inv} />}
      {current === 'history' && <RoomHistory code={inv.code} id={id} />}
    </div>
  );
};

type Sched = ReturnType<typeof useRoomSchedule>;

const RoomSummary: React.FC<{ d: HwSpace; inv: Space; sched: Sched }> = ({ d, inv, sched }) => {
  const occ = d.sensors.find(s => s.type === 'OCCUPANCY');
  const pow = d.sensors.find(s => s.type === 'POWER');
  const mismatches = d.relay_bank.channels.filter(c => c.status === 'MISMATCH').length;
  const sTone = (s: { status: string }): Tone => (s.status === 'ONLINE' ? 'ok' : s.status === 'LOW_BATTERY' ? 'warn' : 'idle');
  const todayName = WEEKDAY[new Date(d.at.slice(0, 10) + 'T00:00:00').getDay()];
  const tasks = usePoll(() => hw.tasks(100), [], { signal: useTree().version });
  const recent = (tasks.data ?? []).filter(t => t.target.split('/')[0].trim() === inv.code).slice(0, 5);
  const todaySlots = sched.week.data?.find(w => w.day === todayName)?.slots ?? [];

  return (
    <div className="p-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
      <Panel title="Status" flush>
        <KV rows={[
          ['Timetable', d.timetable_now ? <span>Now: {evText(d.timetable_now)}{d.next_event ? <span className="text-panel-muted"> · next {evText(d.next_event)}</span> : null}</span>
            : <span>No class now{d.next_event ? <span className="text-panel-muted"> · next {evText(d.next_event)}</span> : null}</span>],
          ['Occupancy', occ ? <span className="inline-flex flex-wrap items-center gap-x-2"><Dot tone={sTone(occ)} /><span className="num">{occ.id}</span><span>{occ.reading}</span><span className="num text-panel-muted">seen {ago(occ.last_seen_s)} ago</span></span> : <span className="text-panel-muted">No occupancy sensor</span>],
          ['Power', pow ? <span className="inline-flex flex-wrap items-center gap-x-2"><Dot tone={sTone(pow)} /><span className="num">{pow.id}</span><span className="num">{pow.reading}{pow.amps != null ? ` · ${pow.amps.toFixed(1)} A` : ''}</span><span className="num text-panel-muted">seen {ago(pow.last_seen_s)} ago</span></span> : <span className="text-panel-muted">No power meter</span>],
          ['Relay bank', d.relay_bank.channels.length ? <StatusText tone={mismatches ? 'warn' : 'ok'}><span><span className="num">{d.relay_bank.id}</span> · {d.relay_bank.channels.length} ch · {mismatches} mismatch</span></StatusText> : <span className="text-panel-muted">No relay bank installed</span>],
          ['Interlock', d.interlock.active ? <span>Active: {d.interlock.reason ?? 'trip blocked'}</span> : <span>None active (trip allowed)</span>],
          ['Connected load', <span><span className="num">{inv.connected_kw.toFixed(2)} kW</span>{inv.estimated_count > 0 && <span className="text-panel-muted"> (estimated ratings, {inv.estimated_count} unverified)</span>}</span>],
          ['Unswitched loads', d.unswitched.length ? <span>{d.unswitched.map(u => `${u.name} x${u.quantity}`).join(', ')} <span className="num text-panel-muted">({d.unswitched.reduce((n, u) => n + u.kw, 0).toFixed(2)} kW)</span></span> : <span className="text-panel-muted">None</span>],
          ['Auto cut', d.cut_armed ? 'Armed for today' : 'Not armed'],
        ]} />
      </Panel>
      <div>
        <Panel title="Relay channels" right={<Link to={`/tree/room/${inv.id}/relays`} className="text-accent hover:underline">Manage</Link>} flush>
          {d.relay_bank.channels.length === 0 ? <Empty>No relay channels.</Empty> : (
            <table className="w-full text-[13px]">
              <tbody>
                {d.relay_bank.channels.map(c => (
                  <tr key={c.ch}><td className={`${TD} num w-12`}>{c.ch}</td><td className={TD}>{c.load}</td><td className={TD}><OnOffChip value={c.feedback} bad={c.status === 'MISMATCH'} /></td><td className={TDR}>{c.measured_kw.toFixed(2)} kW</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
      <div className="xl:col-span-2 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
    <Panel title="Today" right={<span className="num">{d.at.slice(0, 10)}</span>}>
      {inv.classroom_id == null ? <Empty>Not a scheduled room.</Empty>
        : sched.week.error ? <ErrorNote message="Schedule unavailable." />
        : !sched.week.data ? <Loading what="schedule" />
        : <TodayStrip slots={todaySlots} bookings={sched.bookings.data ?? []} nowHHMM={d.at.slice(11, 16)} />}
    </Panel>
        <Panel title="Recent tasks" right={<Link to={`/tree/room/${inv.id}/history`} className="text-accent hover:underline">All history</Link>} flush>
          {tasks.error && !tasks.data ? <ErrorNote message="Tasks unavailable." />
            : !tasks.data ? <Loading what="tasks" />
            : recent.length === 0 ? <Empty>No recorded tasks for this room.</Empty>
            : (
              <ul className="text-[13px]">
                {recent.map((t, i) => (
                  <li key={`${t.time}-${i}`} className="flex items-center gap-2 px-3 h-8 border-b border-panel-seam last:border-b-0">
                    <Dot tone={t.status === 'OK' ? 'ok' : t.status === 'WARN' ? 'warn' : 'bad'} />
                    <span className="num text-panel-muted">{hhmmss(t.time)}</span>
                    <span className="truncate" title={`${t.task} · ${t.result}`}>{t.task}</span>
                  </li>
                ))}
              </ul>
            )}
        </Panel>
      </div>
    </div>
  );
};

const RoomRelays: React.FC<{
  d: HwSpace; id: number; code: string; busy: boolean; request: ReturnType<typeof useSwitcher>['request'];
  onCh: HwChannel[]; offCh: HwChannel[]; items: (c: HwChannel[]) => { ch: string; load: string }[];
}> = ({ d, id, code, busy, request, onCh, offCh, items }) => (
  <div className="p-4 space-y-4">
    <Panel
      title={<>Relay channels · <span className="num">{d.relay_bank.id}</span></>}
      right={<>
        <Btn small disabled={offCh.length === 0 || busy} onClick={() => request('ON', [{ spaceId: id, room: code, items: items(offCh) }])}>Restore</Btn>
        <Btn small kind="primary" disabled={onCh.length === 0 || busy} onClick={() => request('OFF', [{ spaceId: id, room: code, items: items(onCh) }])}>Switch off unoccupied loads</Btn>
      </>}
      flush
    >
      {d.relay_bank.channels.length === 0 ? <Empty>No relay bank is installed in this room.</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[800px]">
            <thead>
              <tr>
                <th className={TH}>Ch</th><th className={TH}>Load</th><th className={THR}>Rated kW</th>
                <th className={TH}>Command</th><th className={TH}>Feedback</th><th className={THR}>Measured kW</th><th className={TH}>Status</th><th className={TH}>Set</th>
              </tr>
            </thead>
            <tbody>
              {d.relay_bank.channels.map(c => {
                const s = CH_STATUS[c.status];
                return (
                  <tr key={c.ch} className="hover:bg-panel-ground">
                    <td className={`${TD} num`}>{c.ch}</td>
                    <td className={TD}><span className="inline-flex items-center gap-2">{c.load}{c.quantity > 1 && <span className="num text-panel-muted">x{c.quantity}</span>}<CategoryChip category={c.category} /></span></td>
                    <td className={TDR}>{c.rated_kw.toFixed(2)}</td>
                    <td className={TD}><OnOffChip value={c.command} /></td>
                    <td className={TD}><OnOffChip value={c.feedback} bad={c.feedback !== c.command} /></td>
                    <td className={TDR}>{c.measured_kw.toFixed(2)}</td>
                    <td className={TD}><StatusText tone={s.tone}>{s.text}</StatusText></td>
                    <td className={TD}>
                      <Seg label={`Set ${code} ${c.ch}`} value={c.command} disabled={busy} onPick={v => request(v, [{ spaceId: id, room: code, items: [{ ch: c.ch, load: c.load }] }])} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
    {d.unswitched.length > 0 && (
      <Panel title="Unswitched loads (no relay)" flush>
        <table className="w-full text-[13px]">
          <thead><tr><th className={TH}>Load</th><th className={TH}>Category</th><th className={THR}>Qty</th><th className={THR}>kW</th></tr></thead>
          <tbody>
            {d.unswitched.map(u => (
              <tr key={u.name}><td className={TD}>{u.name}</td><td className={TD}><CategoryChip category={u.category} /></td><td className={TDR}>{u.quantity}</td><td className={TDR}>{u.kw.toFixed(2)}</td></tr>
            ))}
          </tbody>
        </table>
      </Panel>
    )}
  </div>
);

const RoomSchedule: React.FC<{ inv: Space; sched: Sched; today: string | null }> = ({ inv, sched, today }) => {
  if (inv.classroom_id == null) return <div className="p-4"><Panel title="Schedule"><Empty>This space is not a scheduled room.</Empty></Panel></div>;
  const rows = (sched.week.data ?? []).flatMap(w => w.slots.map(s => ({ day: w.day, s })));
  return (
    <div className="p-4 space-y-4">
      <Panel title="Timetable · week" right={<Link to="/tree/timetable" className="text-accent hover:underline">Open timetable</Link>} flush>
        {sched.week.error ? <ErrorNote message={`Timetable unavailable: ${errorMessage(sched.week.error)}`} />
          : !sched.week.data ? <Loading what="timetable" />
          : rows.length === 0 ? <Empty>No timetabled classes for this room.</Empty>
          : (
            <table className="w-full text-[13px]">
              <thead><tr><th className={TH}>Day</th><th className={TH}>Period</th><th className={TH}>Time</th><th className={TH}>Subject</th><th className={TH}>Teacher</th><th className={TH}>Section</th></tr></thead>
              <tbody>
                {rows.map(({ day, s }) => (
                  <tr key={s.id} className={`hover:bg-panel-ground ${day === today ? 'bg-accent/10' : ''}`}>
                    <td className={TD}>{DAY_NAME[day]}{day === today && <span className="text-xs text-panel-muted"> (today)</span>}</td>
                    <td className={`${TD} num`}>{s.period_number}</td>
                    <td className={`${TD} num`}>{hhmm(s.start_time)}-{hhmm(s.end_time)}</td>
                    <td className={TD}>{s.subject}</td><td className={TD}>{s.teacher}</td><td className={`${TD} num`}>{s.section}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Panel>
      <Panel title="Bookings today" right={<Link to="/tree/book" className="text-accent hover:underline">Book extra class</Link>} flush>
        {sched.bookings.error ? <ErrorNote message={`Bookings unavailable: ${errorMessage(sched.bookings.error)}`} />
          : !sched.bookings.data ? <Loading what="bookings" />
          : sched.bookings.data.length === 0 ? <Empty>No extra bookings today.</Empty>
          : (
            <table className="w-full text-[13px]">
              <thead><tr><th className={TH}>Time</th><th className={TH}>Subject</th><th className={THR}>Students</th><th className={TH}>Status</th><th className={TH}>Requested by</th></tr></thead>
              <tbody>
                {sched.bookings.data.map(b => (
                  <tr key={b.id} className="hover:bg-panel-ground">
                    <td className={`${TD} num`}>{hhmm(b.start_time)}-{hhmm(b.end_time)}</td><td className={TD}>{b.subject}</td>
                    <td className={TDR}>{b.expected_students}</td><td className={TD}>{b.status}</td><td className={TD}>{b.requested_by ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Panel>
    </div>
  );
};

const RoomInventory: React.FC<{ inv: Space }> = ({ inv }) => (
  <div className="p-4">
    <Panel
      title={<>Assets · <span className="num">{inv.assets.length}</span> groups, <span className="num">{inv.connected_kw.toFixed(2)} kW</span> connected</>}
      right={<Link to="/tree/floors" className="text-accent hover:underline">Edit in Floor maps</Link>}
      flush
    >
      {inv.assets.length === 0 ? <Empty>No assets recorded for this room.</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[860px]">
            <thead>
              <tr><th className={TH}>Asset</th><th className={TH}>Category</th><th className={THR}>Qty</th><th className={THR}>Rated kW</th><th className={THR}>Standby W</th><th className={TH}>Controllable</th><th className={TH}>Rating</th><th className={TH}>Make / model</th><th className={TH}>Sensor</th></tr>
            </thead>
            <tbody>
              {inv.assets.map(a => (
                <tr key={a.id} className="hover:bg-panel-ground">
                  <td className={TD}>{a.name}</td><td className={TD}><CategoryChip category={a.category} /></td>
                  <td className={TDR}>{a.quantity}</td><td className={TDR}>{a.total_rated_kw.toFixed(2)}</td><td className={TDR}>{a.standby_power_w}</td>
                  <td className={TD}>{a.controllable ? 'Yes' : 'No'}</td>
                  <td className={TD}><StatusText tone={a.spec_status === 'VERIFIED' ? 'ok' : 'warn'}>{a.spec_status === 'VERIFIED' ? 'Verified' : 'Estimated'}</StatusText></td>
                  <td className={TD}>{a.make_model ?? '-'}</td><td className={`${TD} num`}>{a.sensor_id ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  </div>
);

const RoomHistory: React.FC<{ code: string; id: number }> = ({ code, id }) => {
  const { version, alarms } = useTree();
  const t = usePoll(() => hw.tasks(200), [], { signal: version });
  const rows = useMemo(() => (t.data ?? []).filter(x => x.target.split('/')[0].trim() === code), [t.data, code]);
  const roomAlarms = (alarms ?? []).filter(a => a.space_id === id);
  return (
    <div className="p-4 space-y-4">
      <Panel title={`Tasks · ${code}`} flush>
        {t.error && !t.data ? <ErrorNote message={`History unavailable: ${errorMessage(t.error)}`} />
          : !t.data ? <Loading what="history" />
          : rows.length === 0 ? <Empty>No recorded tasks for this room.</Empty>
          : <TaskTable tasks={rows} />}
      </Panel>
      <Panel title={`Alarms · ${code}`} flush>
        {roomAlarms.length === 0 ? <Empty>No alarms for this room.</Empty> : <AlarmTable alarms={roomAlarms} />}
      </Panel>
    </div>
  );
};
