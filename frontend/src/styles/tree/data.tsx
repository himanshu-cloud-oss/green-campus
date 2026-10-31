import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { hw, HwAlarm, HwChannelRow, HwOverview, HwTask, BuildingSummary } from '../../services/hw';
import { Floor, pilot, Space, errorMessage } from '../../services/pilot';
import type { Tone } from './ui';

export const POLL_MS = 10000;

interface PollState<T> { key: string; data: T | null; error: unknown }

/** Poll an async source. `signal` re-fetches immediately (used after commands). Data is withheld while the key differs. */
export function usePoll<T>(fn: () => Promise<T>, deps: unknown[], opts: { ms?: number; signal?: number } = {}) {
  const { ms = POLL_MS, signal = 0 } = opts;
  const key = JSON.stringify(deps);
  const [st, setSt] = useState<PollState<T>>({ key: '', data: null, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    const run = () =>
      fnRef.current()
        .then(d => { if (alive) setSt({ key, data: d, error: null }); })
        .catch(e => { if (alive) setSt(s => ({ key, data: s.key === key ? s.data : null, error: e })); });
    run();
    const id = ms > 0 ? window.setInterval(run, ms) : undefined;
    return () => { alive = false; if (id) window.clearInterval(id); };
  }, [key, ms, signal, tick]);
  const cur = st.key === key;
  const reload = useCallback(() => setTick(t => t + 1), []);
  return {
    data: cur ? st.data : null,
    error: cur ? st.error : null,
    loading: !cur,
    reload,
  };
}

export const isNetworkError = (e: unknown) => !!e && !(e as { response?: unknown }).response;
export { errorMessage };

export interface SpaceHealth { tone: Tone; note: string }

interface TreeCtx {
  buildings: BuildingSummary[] | null;
  building: BuildingSummary | null;
  selectBuilding: (id: number) => void;
  pilotFloor: Floor | null;
  spaces: Space[];
  spaceById: (id: number) => Space | undefined;
  spaceByCode: (code: string) => Space | undefined;
  overview: HwOverview | null;
  channels: HwChannelRow[] | null;
  alarms: HwAlarm[] | null;
  tasks: HwTask[] | null;
  errors: { overview?: string; channels?: string; alarms?: string; tasks?: string; inventory?: string };
  offline: boolean;
  loading: boolean;
  version: number;
  refresh: () => void;
  health: (spaceId: number) => SpaceHealth;
  gatewayTone: Tone;
  lastUpdate: Date | null;
}

const Ctx = createContext<TreeCtx | null>(null);
export const useTree = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTree outside TreeData');
  return c;
};

const nothing = <T,>(): Promise<T | null> => Promise.resolve(null);

export const TreeData: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(v => v + 1), []);
  const [buildingId, setBuildingId] = useState<number | null>(null);

  const b = usePoll(() => hw.buildings(), [], { ms: 60000, signal: version });
  const inv = usePoll(() => pilot.floors(), [], { ms: 60000, signal: version });

  const building = useMemo(() => {
    const list = b.data ?? [];
    return list.find(x => x.id === buildingId) ?? list[0] ?? null;
  }, [b.data, buildingId]);

  const pilotFloor = useMemo(
    () => (inv.data ?? []).find(f => f.is_pilot && (!building || f.building_id === building.id)) ?? null,
    [inv.data, building],
  );
  const fid = pilotFloor?.id ?? null;
  const ov = usePoll(() => (fid ? hw.overview(fid) : nothing<HwOverview>()), [fid], { signal: version });
  const ch = usePoll(() => (fid ? hw.channels(fid) : nothing<HwChannelRow[]>()), [fid], { signal: version });
  const al = usePoll(() => (fid ? hw.alarms(fid) : nothing<HwAlarm[]>()), [fid], { signal: version });
  const tk = usePoll(() => hw.tasks(60), [], { signal: version });

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  useEffect(() => { if (ov.data) setLastUpdate(new Date()); }, [ov.data]);

  const spaces = useMemo(() => pilotFloor?.spaces ?? [], [pilotFloor]);
  const spaceById = useCallback((id: number) => spaces.find(s => s.id === id), [spaces]);
  const spaceByCode = useCallback((code: string) => spaces.find(s => s.code === code), [spaces]);

  const healthMap = useMemo(() => {
    const m = new Map<number, SpaceHealth>();
    for (const s of spaces) {
      const rows = (ch.data ?? []).filter(r => r.space_id === s.id);
      const p1 = (al.data ?? []).filter(a => a.space_id === s.id && a.priority === 'P1' && !a.acked).length;
      if (p1 > 0) m.set(s.id, { tone: 'bad', note: `${p1} open P1 alarm${p1 > 1 ? 's' : ''}` });
      else if (rows.some(r => r.health === 'MISMATCH')) m.set(s.id, { tone: 'bad', note: 'Relay feedback mismatch' });
      else if (rows.some(r => r.health === 'WASTE')) m.set(s.id, { tone: 'warn', note: 'Unoccupied and powered' });
      else if (rows.length === 0 || rows.every(r => r.health === 'STALE')) m.set(s.id, { tone: 'idle', note: 'No data' });
      else if (rows.some(r => r.health === 'STALE')) m.set(s.id, { tone: 'warn', note: 'Stale sensor data' });
      else m.set(s.id, { tone: 'ok', note: 'OK' });
    }
    return m;
  }, [spaces, ch.data, al.data]);
  const health = useCallback((id: number): SpaceHealth => healthMap.get(id) ?? { tone: 'idle', note: 'No data' }, [healthMap]);

  const gw = ov.data?.gateway.status?.toLowerCase();
  const gatewayTone: Tone = !ov.data ? 'idle' : gw === 'online' ? 'ok' : 'bad';

  const errs = {
    overview: ov.error ? errorMessage(ov.error) : undefined,
    channels: ch.error ? errorMessage(ch.error) : undefined,
    alarms: al.error ? errorMessage(al.error) : undefined,
    tasks: tk.error ? errorMessage(tk.error) : undefined,
    inventory: inv.error || b.error ? errorMessage(inv.error ?? b.error) : undefined,
  };
  const offline = [b.error, inv.error].some(e => e && isNetworkError(e)) || (!!ov.error && isNetworkError(ov.error));

  const value: TreeCtx = {
    buildings: b.data, building, selectBuilding: setBuildingId, pilotFloor, spaces, spaceById, spaceByCode,
    overview: ov.data, channels: ch.data, alarms: al.data, tasks: tk.data, errors: errs, offline,
    loading: b.loading || inv.loading, version, refresh, health, gatewayTone, lastUpdate,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
