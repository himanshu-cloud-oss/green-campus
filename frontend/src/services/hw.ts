/**
 * Typed client for the simulated hardware layer (/api/hw/*) and building listing.
 * Shared by the Resource Tree and Site Controller styles. Everything here is simulated
 * until relays, PIR sensors and CT meters are installed.
 */
import { apiClient } from './api';

export type Priority = 'P1' | 'P2' | 'P3';
export type ChannelHealth = 'OK' | 'WASTE' | 'MISMATCH' | 'STALE';
export type OnOff = 'ON' | 'OFF';

export interface HwOverview {
  simulated: true;
  at: string;
  floor: { id: number; name: string; building: string };
  gateway: { id: string; status: string; last_seen_s: number };
  load_kw: number;
  waste_kw: number;
  unoccupied_powered_rooms: number;
  sensors: { online: number; total: number };
  relays: { ok: number; total: number; mismatch: number };
  meters: { ok: number; total: number; stale: number };
  alarms: { open: number; unacked: number; p1: number; p2: number; p3: number };
}

export interface HwEvent {
  kind: 'TIMETABLE' | 'BOOKING';
  subject: string;
  teacher: string | null;
  section: string | null;
  start: string;
  end: string;
}

export interface HwChannel {
  ch: string;
  category: string;
  load: string;
  quantity: number;
  rated_kw: number;
  command: OnOff;
  feedback: OnOff;
  measured_kw: number;
  status: 'OK' | 'MISMATCH' | 'OFF';
}

export interface HwSensor {
  id: string;
  type: 'OCCUPANCY' | 'POWER';
  reading: string;
  battery_pct: number | null;
  amps: number | null;
  last_seen_s: number;
  status: 'ONLINE' | 'STALE' | 'LOW_BATTERY';
}

export interface HwSpace {
  simulated: true;
  at: string;
  space: { id: number; code: string; name: string; kind: string; capacity: number | null };
  state: string;
  label: string | null;
  state_since: string;
  kw: number;
  waste_kw: number;
  cut_armed: boolean;
  timetable_now: HwEvent | null;
  next_event: HwEvent | null;
  relay_bank: { id: string; channels: HwChannel[] };
  unswitched: { name: string; category: string; quantity: number; kw: number }[];
  sensors: HwSensor[];
  interlock: { active: boolean; reason: string | null };
}

export interface HwChannelRow {
  space_id: number;
  room: string;
  kind: string;
  ch: string;
  category: string;
  load: string;
  command: OnOff;
  feedback: OnOff;
  kw: number;
  occupancy: string;
  sensor_last_seen_s: number;
  rule: string;
  health: ChannelHealth;
}

export interface HwAlarm {
  key: string;
  priority: Priority;
  time: string;
  object: string;
  space_id: number | null;
  message: string;
  acked: boolean;
  acked_at: string | null;
  acked_by: string | null;
}

export interface HwTask {
  time: string;
  target: string;
  task: string;
  user: string;
  result: string;
  status: 'OK' | 'WARN' | 'ERROR';
}

export interface BuildingSummary {
  id: number;
  code: string;
  name: string;
  floors: { id: number; level: number; name: string; is_pilot: boolean; spaces_count: number; connected_kw: number }[];
}

const q = (params: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export const hw = {
  overview: (floorId?: number, at?: string) =>
    apiClient.get<HwOverview>('/api/hw/overview', { params: q({ floor_id: floorId, at }) }).then(r => r.data),
  space: (spaceId: number, at?: string) =>
    apiClient.get<HwSpace>(`/api/hw/spaces/${spaceId}`, { params: q({ at }) }).then(r => r.data),
  channels: (floorId?: number, at?: string) =>
    apiClient.get<HwChannelRow[]>('/api/hw/channels', { params: q({ floor_id: floorId, at }) }).then(r => r.data),
  alarms: (floorId?: number, at?: string) =>
    apiClient.get<HwAlarm[]>('/api/hw/alarms', { params: q({ floor_id: floorId, at }) }).then(r => r.data),
  ack: (key: string) => apiClient.post<{ key: string; acked: true; acked_at: string }>('/api/hw/alarms/ack', { key }).then(r => r.data),
  /** Throws an AxiosError with status 409 and detail "Class in session — trip blocked" when interlocked. */
  switch: (spaceId: number, state: OnOff, channels?: string[], force = false) =>
    apiClient.post<HwTask & { simulated: true }>(`/api/hw/spaces/${spaceId}/switch`, { state, channels, force }).then(r => r.data),
  tasks: (limit = 50) => apiClient.get<HwTask[]>('/api/hw/tasks', { params: { limit } }).then(r => r.data),
  buildings: () => apiClient.get<BuildingSummary[]>('/api/inventory/buildings').then(r => r.data),
};

/** "3 s", "6 m", "1 h" */
export const ago = (s: number) => (s < 60 ? `${s} s` : s < 3600 ? `${Math.round(s / 60)} m` : `${Math.round(s / 3600)} h`);
