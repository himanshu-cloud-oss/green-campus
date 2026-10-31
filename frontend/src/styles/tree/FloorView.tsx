import React, { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ago, hw, HwChannelRow } from '../../services/hw';
import { pilot, errorMessage } from '../../services/pilot';
import { SingleLineDiagram } from '../../components/panel/SingleLineDiagram';
import { LoadRibbon } from '../../components/panel/LoadRibbon';
import { FloorMaps } from '../../pages/FloorMaps';
import { useTree, usePoll } from './data';
import { useSwitcher, SwitchGroup } from './switching';
import { AlarmTable, SensorRow, SensorTable } from './tables';
import { Btn, Dot, Empty, ErrorNote, Loading, ObjectHeader, OnOffChip, Panel, TD, TDR, TH, THR, Tabs, Tone } from './ui';

/** All spaces of the live floor with their relay banks and sensors, polled in parallel. */
export function useFloorSpaces() {
  const { spaces, version } = useTree();
  const ids = spaces.map(s => s.id).join(',');
  return usePoll(async () => {
    const res = await Promise.allSettled(spaces.map(s => hw.space(s.id)));
    const ok = res.flatMap(r => (r.status === 'fulfilled' ? [r.value] : []));
    if (ok.length === 0 && res.length > 0) throw (res[0] as PromiseRejectedResult).reason;
    return ok;
  }, [ids], { signal: version });
}

const Kpi: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; warn?: boolean }> = ({ label, value, sub, warn }) => (
  <div className="px-3 py-2 border-r border-panel-seam last:border-r-0 min-w-0">
    <div className="text-xs text-panel-muted">{label}</div>
    <div className={`num text-[18px] leading-6 font-semibold ${warn ? 'text-waste' : ''}`}>{value}</div>
    {sub && <div className="num text-xs text-panel-muted">{sub}</div>}
  </div>
);

const HEALTH: Record<HwChannelRow['health'], { tone: Tone; text: string }> = {
  OK: { tone: 'ok', text: 'OK' },
  WASTE: { tone: 'warn', text: 'Unoccupied, powered' },
  MISMATCH: { tone: 'bad', text: 'Feedback mismatch' },
  STALE: { tone: 'idle', text: 'Stale data' },
};

const Summary: React.FC<{ floorId: number }> = ({ floorId }) => {
  const { overview: o, errors, version, spaces } = useTree();
  const navigate = useNavigate();
  const [at, setAt] = useState<string | null>(null);
  const live = usePoll(() => pilot.live(at ?? undefined), [floorId, at], { signal: version, ms: at ? 0 : 10000 });
  const series = usePoll(() => pilot.series(24, 10), [floorId], { ms: 60000 });

  return (
    <div className="p-4 space-y-4">
      <Panel flush label="Floor status">
        {errors.overview && !o ? <ErrorNote message={`Floor status unavailable: ${errors.overview}`} /> : !o ? <Loading what="floor status" /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
            <Kpi label="Load" value={`${o.load_kw.toFixed(2)} kW`} />
            <Kpi label="Waste" value={`${o.waste_kw.toFixed(2)} kW`} warn={o.waste_kw > 0} sub={`${o.unoccupied_powered_rooms} room${o.unoccupied_powered_rooms === 1 ? '' : 's'} unoccupied, powered`} />
            <Kpi label="Sensors online" value={`${o.sensors.online}/${o.sensors.total}`} />
            <Kpi label="Relays confirmed" value={`${o.relays.ok}/${o.relays.total}`} warn={o.relays.mismatch > 0} sub={`${o.relays.mismatch} mismatch`} />
            <Kpi label="Meters reporting" value={`${o.meters.ok}/${o.meters.total}`} warn={o.meters.stale > 0} sub={`${o.meters.stale} stale`} />
            <Kpi label="Open alarms" value={o.alarms.open} warn={o.alarms.unacked > 0} sub={`${o.alarms.unacked} unacked`} />
            <Kpi label="By priority" value={`${o.alarms.p1} / ${o.alarms.p2} / ${o.alarms.p3}`} sub="P1 / P2 / P3" warn={o.alarms.p1 > 0} />
          </div>
        )}
      </Panel>

      <Panel title="Single-line diagram" right={at ? (
        <>
          <span className="num">Replaying {at.slice(11, 16)}</span>
          <Btn small onClick={() => setAt(null)}>Return to live</Btn>
        </>
      ) : <span>Select a room to open it</span>} flush>
        {live.error && !live.data ? <ErrorNote message={`Diagram unavailable: ${errorMessage(live.error)}`} />
          : !live.data ? <Loading what="diagram" />
          : (
            <div className="overflow-x-auto p-2">
              <SingleLineDiagram
                snapshot={live.data}
                selected={null}
                onSelect={code => { const s = spaces.find(x => x.code === code); if (s) navigate(`/tree/room/${s.id}`); }}
              />
            </div>
          )}
      </Panel>

      <Panel title="Floor load · last 24 h" right={<span>Click a point to replay</span>}>
        {series.error && !series.data ? <ErrorNote message={`Load history unavailable: ${errorMessage(series.error)}`} />
          : !series.data ? <Loading what="load history" />
          : <LoadRibbon points={series.data.points} at={at} onPick={setAt} />}
      </Panel>
    </div>
  );
};

const Relays: React.FC = () => {
  const { channels, errors } = useTree();
  const sw = useSwitcher();
  const [room, setRoom] = useState('');
  const [health, setHealth] = useState('');
  const [onlyWaste, setOnlyWaste] = useState(false);
  const [sel, setSel] = useState<Set<string>>(() => new Set());
  const key = (r: HwChannelRow) => `${r.space_id}:${r.ch}`;

  const rooms = useMemo(() => Array.from(new Set((channels ?? []).map(r => r.room))), [channels]);
  const rows = useMemo(
    () => (channels ?? []).filter(r => (!room || r.room === room) && (!health || r.health === health) && (!onlyWaste || (r.health === 'WASTE' && r.command === 'ON'))),
    [channels, room, health, onlyWaste],
  );
  const chosen = (channels ?? []).filter(r => sel.has(key(r)));
  const chosenOn = chosen.filter(r => r.command === 'ON');
  const allSel = rows.length > 0 && rows.every(r => sel.has(key(r)));

  const toggle = (k: string) => setSel(p => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const toggleAll = () => setSel(p => { const n = new Set(p); rows.forEach(r => (allSel ? n.delete(key(r)) : n.add(key(r)))); return n; });

  const switchOff = () => {
    const groups = new Map<number, SwitchGroup>();
    for (const r of chosenOn) {
      const g = groups.get(r.space_id) ?? { spaceId: r.space_id, room: r.room, items: [] };
      g.items!.push({ ch: r.ch, load: r.load });
      groups.set(r.space_id, g);
    }
    sw.request('OFF', [...groups.values()]);
  };

  const field = 'h-7 px-2 text-[13px] border border-panel-wire rounded-[4px] bg-panel-raised text-panel-ink';
  return (
    <div className="p-4 space-y-3">
      {sw.bar && <div className="-mx-4 -mt-2">{sw.bar}</div>}
      <Panel
        title={`Relay manager · ${rows.length} of ${(channels ?? []).length} channels`}
        right={<Btn small kind="primary" disabled={chosenOn.length === 0 || sw.busy} onClick={switchOff}>Switch off selected{chosenOn.length ? ` (${chosenOn.length})` : ''}</Btn>}
        flush
      >
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-b border-panel-seam text-[13px]">
          <label className="flex items-center gap-1.5">Room
            <select className={field} value={room} onChange={e => setRoom(e.target.value)}>
              <option value="">All rooms</option>
              {rooms.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1.5">Health
            <select className={field} value={health} onChange={e => setHealth(e.target.value)}>
              <option value="">All</option>
              {Object.entries(HEALTH).map(([k, v]) => <option key={k} value={k}>{v.text}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={onlyWaste} onChange={e => setOnlyWaste(e.target.checked)} />
            Only unoccupied &amp; powered
          </label>
          {(room || health || onlyWaste) && <Btn small kind="ghost" onClick={() => { setRoom(''); setHealth(''); setOnlyWaste(false); }}>Clear filters</Btn>}
        </div>
        {errors.channels && !channels ? <ErrorNote message={`Relay data unavailable: ${errors.channels}`} />
          : !channels ? <Loading what="relays" />
          : rows.length === 0 ? <Empty>No channels match the current filters.</Empty>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[1020px]">
                <thead>
                  <tr>
                    <th className={`${TH} w-9`}><input type="checkbox" aria-label="Select all visible channels" checked={allSel} onChange={toggleAll} /></th>
                    <th className={TH}>Room</th>
                    <th className={TH}>Ch</th>
                    <th className={TH}>Load</th>
                    <th className={TH}>Command</th>
                    <th className={TH}>Feedback</th>
                    <th className={THR}>kW</th>
                    <th className={TH}>Occupancy</th>
                    <th className={THR}>Last seen</th>
                    <th className={TH}>Rule</th>
                    <th className={TH}>Health</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const h = HEALTH[r.health];
                    return (
                      <tr key={key(r)} className={`hover:bg-panel-ground ${sel.has(key(r)) ? 'bg-accent/10' : ''}`}>
                        <td className={TD}><input type="checkbox" aria-label={`Select ${r.room} ${r.ch}`} checked={sel.has(key(r))} onChange={() => toggle(key(r))} /></td>
                        <td className={`${TD} num`}><Link className="text-accent hover:underline" to={`/tree/room/${r.space_id}`}>{r.room}</Link></td>
                        <td className={`${TD} num`}>{r.ch}</td>
                        <td className={TD}>{r.load}</td>
                        <td className={TD}><OnOffChip value={r.command} /></td>
                        <td className={TD}><OnOffChip value={r.feedback} bad={r.feedback !== r.command} /></td>
                        <td className={TDR}>{r.kw.toFixed(2)}</td>
                        <td className={TD}>{r.occupancy}</td>
                        <td className={TDR}>{ago(r.sensor_last_seen_s)} ago</td>
                        <td className={`${TD} text-panel-muted`}>{r.rule}</td>
                        <td className={TD}><span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Dot tone={h.tone} />{h.text}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Panel>
    </div>
  );
};

const Sensors: React.FC = () => {
  const spaces = useFloorSpaces();
  const rows: SensorRow[] = (spaces.data ?? []).flatMap(s => s.sensors.map(sensor => ({ room: s.space.code, spaceId: s.space.id, sensor })));
  const online = rows.filter(r => r.sensor.status === 'ONLINE').length;
  return (
    <div className="p-4">
      <Panel title={`Sensors · ${online} of ${rows.length} online`} flush>
        {spaces.error && !spaces.data ? <ErrorNote message={`Sensor data unavailable: ${errorMessage(spaces.error)}`} />
          : !spaces.data ? <Loading what="sensors" />
          : rows.length === 0 ? <Empty>No sensors are registered on this floor.</Empty>
          : <div className="overflow-x-auto"><SensorTable rows={rows} /></div>}
      </Panel>
    </div>
  );
};

const FloorAlarms: React.FC = () => {
  const { alarms, errors } = useTree();
  return (
    <div className="p-4">
      <Panel title={`Alarms · ${(alarms ?? []).filter(a => !a.acked).length} unacknowledged`} flush>
        {errors.alarms && !alarms ? <ErrorNote message={`Alarms unavailable: ${errors.alarms}`} />
          : !alarms ? <Loading what="alarms" />
          : alarms.length === 0 ? <Empty>No alarms on this floor.</Empty>
          : <AlarmTable alarms={alarms} />}
      </Panel>
    </div>
  );
};

export const FloorView: React.FC = () => {
  const { floorId, tab = 'summary' } = useParams();
  const { building, pilotFloor, overview: o, alarms, gatewayTone } = useTree();
  const id = Number(floorId);
  const f = building?.floors.find(x => x.id === id);
  const live = !!pilotFloor && pilotFloor.id === id;

  if (building && !f) return <Navigate to="/tree" replace />;
  const base = `/tree/floor/${id}`;
  const tabs = live
    ? [
        { id: 'summary', label: 'Summary', to: base },
        { id: 'relays', label: 'Relays', to: `${base}/relays` },
        { id: 'sensors', label: 'Sensors', to: `${base}/sensors` },
        { id: 'alarms', label: 'Alarms', to: `${base}/alarms`, count: (alarms ?? []).filter(a => !a.acked).length },
        { id: 'map', label: 'Map', to: `${base}/map` },
      ]
    : [
        { id: 'summary', label: 'Summary', to: base },
        { id: 'map', label: 'Map', to: `${base}/map` },
      ];
  const current = tabs.some(t => t.id === tab) ? tab : 'summary';

  return (
    <div>
      <ObjectHeader
        crumbs={building?.name}
        title={f?.name ?? 'Floor'}
        status={f ? (live ? (
          <>
            <Dot tone={gatewayTone} />
            <span>Live · {o ? `${o.load_kw.toFixed(2)} kW, ${o.alarms.open} open alarms` : 'waiting for status'} · simulated</span>
          </>
        ) : <span>Not instrumented</span>) : undefined}
        actions={live && <Link to={`/tree/gateway/${id}`} className="text-[13px] text-accent hover:underline">Gateway {o?.gateway.id}</Link>}
      />
      <div className="px-4"><Tabs tabs={tabs} current={current} /></div>
      {current === 'summary' && (live ? <Summary floorId={id} /> : (
        <div className="p-4">
          <Panel title="Not instrumented">
            <p className="text-[13px]">
              This floor has no gateway, relays or sensors yet, so there is no live data. Spaces and connected load are tracked in the inventory
              ({f?.spaces_count ?? 0} spaces, <span className="num">{(f?.connected_kw ?? 0).toFixed(1)} kW</span> connected).
            </p>
            <p className="text-[13px] mt-2"><Link className="text-accent hover:underline" to="/tree/floors">Open Floor maps &amp; inventory</Link></p>
          </Panel>
        </div>
      ))}
      {live && current === 'relays' && <Relays />}
      {live && current === 'sensors' && <Sensors />}
      {live && current === 'alarms' && <FloorAlarms />}
      {current === 'map' && <FloorMaps />}
    </div>
  );
};
