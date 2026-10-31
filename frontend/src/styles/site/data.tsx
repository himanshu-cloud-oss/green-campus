import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { useSearchParams } from 'react-router-dom';
import { BuildingSummary, hw, HwAlarm, HwChannelRow, HwOverview, HwSpace, HwTask, OnOff } from '../../services/hw';
import { errorMessage, Floor, LiveSnapshot, pilot, Space, SpaceReading } from '../../services/pilot';
import { Health } from './ui';

export interface CommandReq {
  spaceId: number; code: string; state: OnOff; channels: string[]; labels: string[];
}
export type CommandStatus =
  | { kind: 'confirm' } | { kind: 'running' }
  | { kind: 'blocked'; reason: string }
  | { kind: 'done'; task: HwTask } | { kind: 'error'; message: string };

interface SiteState {
  buildings: BuildingSummary[];
  floorId: number | null;
  setFloorId: (id: number) => void;
  floorIsPilot: boolean;
  floorName: string;
  floor: Floor | null;
  overview: HwOverview | null;
  live: LiveSnapshot | null;
  channels: HwChannelRow[];
  alarms: HwAlarm[];
  tasks: HwTask[];
  details: Record<number, HwSpace>;
  loading: boolean;
  offline: boolean;
  error: string | null;
  refresh: () => void;
  selectedId: number | null;
  select: (id: number | null) => void;
  spaceById: (id: number) => Space | undefined;
  readingOf: (id: number) => SpaceReading | undefined;
  healthOf: (id: number) => Health;
  cmd: { req: CommandReq; status: CommandStatus } | null;
  requestCmd: (r: CommandReq) => void;
  confirmCmd: (force?: boolean) => void;
  dismissCmd: () => void;
}

const Ctx = createContext<SiteState | null>(null);
export const useSite = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSite outside SiteData');
  return v;
};

const isNetwork = (e: unknown) => !(e as AxiosError)?.response;

export const SiteData: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [buildings, setBuildings] = useState<BuildingSummary[]>([]);
  const [floorId, setFloorIdState] = useState<number | null>(null);
  const [floor, setFloor] = useState<Floor | null>(null);
  const [overview, setOverview] = useState<HwOverview | null>(null);
  const [live, setLive] = useState<LiveSnapshot | null>(null);
  const [channels, setChannels] = useState<HwChannelRow[]>([]);
  const [alarms, setAlarms] = useState<HwAlarm[]>([]);
  const [tasks, setTasks] = useState<HwTask[]>([]);
  const [details, setDetails] = useState<Record<number, HwSpace>>({});
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cmd, setCmd] = useState<SiteState['cmd']>(null);
  const [params, setParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const floorRef = useRef<number | null>(null);
  floorRef.current = floorId;

  // buildings -> default floor (first pilot floor)
  useEffect(() => {
    hw.buildings().then(b => {
      setBuildings(b);
      const all = b.flatMap(x => x.floors);
      const def = all.find(f => f.is_pilot) ?? all[0];
      if (def) setFloorIdState(def.id);
      else setLoading(false);
    }).catch(e => { setOffline(isNetwork(e)); setError(errorMessage(e)); setLoading(false); });
  }, []);

  const floorMeta = useMemo(() => {
    for (const b of buildings) {
      const f = b.floors.find(x => x.id === floorId);
      if (f) return { pilot: f.is_pilot, name: `${b.name} · ${f.name}` };
    }
    return { pilot: false, name: '' };
  }, [buildings, floorId]);

  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    const id = setInterval(refresh, 10000);
    window.addEventListener('gc:refresh', refresh);
    return () => { clearInterval(id); window.removeEventListener('gc:refresh', refresh); };
  }, [refresh]);

  useEffect(() => {
    if (floorId == null) return;
    let alive = true;
    if (!floorMeta.pilot) {
      setOverview(null); setLive(null); setChannels([]); setAlarms([]); setDetails({}); setFloor(null);
      setLoading(false);
      return;
    }
    (async () => {
      const [ov, lv, ch, al, tk, fl] = await Promise.allSettled([
        hw.overview(floorId), pilot.live(), hw.channels(floorId), hw.alarms(floorId), hw.tasks(50), pilot.floors(),
      ]);
      if (!alive || floorRef.current !== floorId) return;
      const failed = [ov, lv, ch, al].find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
      setOffline(failed ? isNetwork(failed.reason) : false);
      setError(failed && !isNetwork(failed.reason) ? errorMessage(failed.reason) : null);
      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (lv.status === 'fulfilled') setLive(lv.value);
      if (ch.status === 'fulfilled') setChannels(ch.value);
      if (al.status === 'fulfilled') setAlarms(al.value);
      if (tk.status === 'fulfilled') setTasks(tk.value);
      let fl_: Floor | null = null;
      if (fl.status === 'fulfilled') {
        fl_ = fl.value.find(f => f.id === floorId) ?? null;
        setFloor(fl_);
      }
      setLoading(false);
      const spaces = fl_?.spaces ?? [];
      if (spaces.length) {
        const res = await Promise.allSettled(spaces.map(s => hw.space(s.id)));
        if (!alive || floorRef.current !== floorId) return;
        const next: Record<number, HwSpace> = {};
        res.forEach((r, i) => { if (r.status === 'fulfilled') next[spaces[i].id] = r.value; });
        setDetails(next);
      }
    })();
    return () => { alive = false; };
  }, [floorId, floorMeta.pilot, tick]);

  const setFloorId = useCallback((id: number) => {
    setLoading(true); setFloorIdState(id); setSelectedId(null); setCmd(null);
  }, []);

  const spaceById = useCallback((id: number) => floor?.spaces.find(s => s.id === id), [floor]);
  const readingOf = useCallback((id: number) => live?.spaces.find(s => s.space_id === id), [live]);

  // ?room=CODE (command palette) selects a room
  useEffect(() => {
    const code = params.get('room');
    if (!code || !floor) return;
    const s = floor.spaces.find(x => x.code === code);
    if (s) setSelectedId(s.id);
    const next = new URLSearchParams(params);
    next.delete('room');
    setParams(next, { replace: true });
  }, [params, floor, setParams]);

  const healthOf = useCallback((id: number): Health => {
    const rows = channels.filter(c => c.space_id === id);
    const al = alarms.filter(a => a.space_id === id && !a.acked);
    if (al.some(a => a.priority === 'P1') || rows.some(c => c.health === 'MISMATCH')) return 'fault';
    const d = details[id];
    if (d && d.sensors.length > 0 && d.sensors.every(s => s.status === 'STALE')) return 'offline';
    if ((readingOf(id)?.waste_kw ?? d?.waste_kw ?? 0) > 0) return 'warn';
    return 'ok';
  }, [channels, alarms, details, readingOf]);

  const select = useCallback((id: number | null) => setSelectedId(id), []);

  const requestCmd = useCallback((r: CommandReq) => setCmd({ req: r, status: { kind: 'confirm' } }), []);
  const dismissCmd = useCallback(() => setCmd(null), []);
  const confirmCmd = useCallback((force = false) => {
    if (!cmd) return;
    const req = cmd.req;
    setCmd({ req, status: { kind: 'running' } });
    hw.switch(req.spaceId, req.state, req.channels, force).then(task => {
      setCmd({ req, status: { kind: 'done', task } });
      refresh();
    }).catch((e: AxiosError<{ detail?: string }>) => {
      if (e.response?.status === 409) {
        const reason = typeof e.response.data?.detail === 'string' ? e.response.data.detail : 'Interlock active';
        setCmd({ req, status: { kind: 'blocked', reason } });
      } else {
        setCmd({ req, status: { kind: 'error', message: errorMessage(e) } });
      }
    });
  }, [cmd, refresh]);

  const value: SiteState = {
    buildings, floorId, setFloorId, floorIsPilot: floorMeta.pilot, floorName: floorMeta.name, floor, overview, live,
    channels, alarms, tasks, details, loading, offline, error, refresh, selectedId, select, spaceById, readingOf,
    healthOf, cmd, requestCmd, confirmCmd, dismissCmd,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
