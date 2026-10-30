/**
 * Typed client for the pilot-floor endpoints: inventory, simulated telemetry,
 * automatic booking and the savings model. No offline fallbacks: if the backend
 * is down the UI shows that, rather than inventing numbers.
 */
import { AxiosError } from 'axios';
import { apiClient } from './api';

export type Category = 'HVAC' | 'FAN' | 'LIGHTING' | 'AV' | 'IT' | 'APPLIANCE' | 'OTHER';
export type SpaceKind = 'CLASSROOM' | 'LAB' | 'STAFF_ROOM' | 'CORRIDOR' | 'WASHROOM' | 'COMMON' | 'OTHER';
export type RoomState =
  | 'OCCUPIED' | 'BOOKED' | 'PRECOOL' | 'VACANT' | 'NO_SHOW' | 'LUNCH' | 'AFTER_HOURS' | 'OPEN' | 'CLOSED';

export const CATEGORY_LABEL: Record<Category, string> = {
  HVAC: 'AC', FAN: 'Fans', LIGHTING: 'Lights', AV: 'AV', IT: 'IT', APPLIANCE: 'Appliances', OTHER: 'Other',
};

export const STATE_LABEL: Record<RoomState, string> = {
  OCCUPIED: 'In class', BOOKED: 'Extra class', PRECOOL: 'Pre-cooling', VACANT: 'Free period',
  NO_SHOW: 'Class not held', LUNCH: 'Lunch break', AFTER_HOURS: 'After hours', OPEN: 'Floor open', CLOSED: 'Floor closed',
};

export interface Asset {
  id: number;
  space_id: number;
  device_type: string;
  category: Category;
  name: string;
  quantity: number;
  rated_power_w: number;
  standby_power_w: number;
  controllable: boolean;
  spec_status: 'ESTIMATED' | 'VERIFIED';
  make_model: string | null;
  sensor_id: string | null;
  notes: string | null;
  total_rated_kw: number;
}

export interface Space {
  id: number;
  floor_id: number;
  code: string;
  name: string;
  kind: SpaceKind;
  capacity: number | null;
  bookable: boolean;
  classroom_id: number | null;
  map_x: number;
  map_y: number;
  map_w: number;
  map_h: number;
  notes: string | null;
  connected_kw: number;
  estimated_count: number;
  assets: Asset[];
}

export interface Floor {
  id: number;
  building_id: number;
  building: string | null;
  level: number;
  name: string;
  is_pilot: boolean;
  map_width: number;
  map_height: number;
  notes: string | null;
  connected_kw: number;
  spaces: Space[];
}

export interface DeviceType {
  key: string;
  name: string;
  category: Category;
  rated_w: number;
  standby_w: number;
  controllable: boolean;
  duty: number;
}

export interface AssetReading {
  asset_id: number;
  name: string;
  device_type: string;
  category: Category;
  quantity: number;
  on_count: number;
  kw: number;
  controllable: boolean;
}

export interface SpaceReading {
  space_id: number;
  code: string;
  name: string;
  kind: SpaceKind;
  capacity: number | null;
  classroom_id: number | null;
  state: RoomState;
  label: string | null;
  teacher?: string;
  section?: string;
  headcount: number;
  kw: number;
  waste_kw: number;
  waste_reason: string | null;
  cut_armed: boolean;
  state_since: string | null;
  assets: AssetReading[];
}

export interface LiveSnapshot {
  timestamp: string;
  simulated: true;
  outdoor_temp_c: number;
  total_kw: number;
  waste_kw: number;
  by_category: Record<Category, number>;
  units_on: number;
  units_total: number;
  floor: { id: number; name: string; building: string } | null;
  spaces: SpaceReading[];
}

export interface SeriesPoint {
  t: string;
  kw: number;
  waste_kw: number;
  temp_c: number;
  [key: `cat_${string}`]: number;
}

export interface TimetableSlot {
  id: number;
  classroom_id: number;
  day_of_week: string;
  period_number: string;
  start_time: string;
  end_time: string;
  subject: string;
  teacher: string;
  section: string;
}

export interface DayEnergy {
  date: string;
  kwh: number;
  waste_kwh: number;
  [key: `cat_${string}`]: number | string;
}

export interface MonthEstimate {
  month: string;
  days_elapsed: number;
  month_to_date_kwh: number;
  waste_to_date_kwh: number;
  projected_kwh: number;
  campus_bill: { month: string; total_kwh: number; grid_kwh: number; generator_kwh: number; solar_kwh: number } | null;
  floor_share_pct: number | null;
}

export interface SlotOption {
  classroom_id: number;
  room: string;
  capacity: number;
  date: string;
  start_time: string;
  end_time: string;
  est_kwh: number;
  est_cost_inr: number;
  breakdown: { session_kwh: number; precool_kwh: number; after_hours_kwh: number };
  empty_seats: number;
  reasons: string[];
  score: number;
}

export interface AutoBookingRequest {
  subject: string;
  expected_students: number;
  date: string;
  search_days: number;
  window_start: string;
  window_end: string;
  duration_minutes: number;
  needs: string[];
  align_to_periods: boolean;
  allow_lunch: boolean;
  include_weekends: boolean;
  auto_book: boolean;
  requested_by?: string;
  notes?: string;
}

export interface BookingRecord {
  id: number;
  classroom_id: number;
  date: string;
  start_time: string;
  end_time: string;
  subject: string;
  expected_students: number;
  notes: string | null;
  status: string;
  source: string | null;
  requested_by: string | null;
  created_at: string;
}

export interface AutoBookingResult {
  booked: BookingRecord | null;
  chosen: SlotOption | null;
  alternatives: SlotOption[];
  total_options: number;
  eligible_rooms: string[];
  rejected_rooms: { room: string; reason: string }[];
  days_searched: string[];
  message: string;
}

export interface SavingsParams {
  space_ids: number[] | null;
  categories: Category[];
  vacant_periods: boolean;
  lunch: boolean;
  no_show: boolean;
  after_hours: boolean;
  grace_minutes: number;
  no_show_rate: number;
  ac_setpoint_raise_c: number;
  ac_saving_per_degree: number;
  bldc_fan_retrofit: boolean;
  teaching_days: number[];
  energy_charge_inr_kwh: number;
  surcharges_inr_kwh: number;
  use_real_supply_mix: boolean;
  diesel_inr_per_litre: number;
  dg_kwh_per_litre: number;
  grid_emission_kg_kwh: number;
  diesel_kg_co2_per_litre: number;
  hardware_inr_per_room: number;
  bldc_inr_per_fan: number;
}

export interface SavingsResult {
  scope: { spaces: string[]; controlled_rooms: number; categories: string[]; ceiling_fans: number };
  annual: {
    baseline_kwh: number; saved_kwh: number; automated_kwh: number; saved_pct: number;
    cost_saved_inr: number; co2_saved_kg: number; trees_equivalent: number; capex_inr: number;
    payback_years: number | null;
  };
  by_strategy: Record<string, number>;
  by_category: Record<string, number>;
  by_space: { code: string; kind: SpaceKind; baseline_kwh: number; saved_kwh: number }[];
  by_month: {
    month: string; teaching_days: number; baseline_kwh: number; saved_kwh: number;
    cost_saved_inr: number; co2_saved_kg: number; dg_share_pct: number; campus_bill_kwh: number | null;
  }[];
}

export function errorMessage(err: unknown): string {
  const ax = err as AxiosError<{ detail?: unknown }>;
  const detail = ax?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join('; ');
  if (ax?.code === 'ERR_NETWORK') return 'Backend is not reachable on port 8000.';
  return ax?.message || 'Something went wrong';
}

const get = async <T>(url: string, params?: object) => (await apiClient.get<T>(url, { params })).data;
const post = async <T>(url: string, body?: object) => (await apiClient.post<T>(url, body)).data;
const patch = async <T>(url: string, body?: object) => (await apiClient.patch<T>(url, body)).data;
const del = async <T>(url: string) => (await apiClient.delete<T>(url)).data;

export const pilot = {
  floors: () => get<Floor[]>('/api/inventory/floors'),
  deviceTypes: () => get<DeviceType[]>('/api/inventory/device-types'),
  updateFloor: (id: number, body: Partial<Floor>) => patch<Floor>(`/api/inventory/floors/${id}`, body),
  createSpace: (floorId: number, body: Partial<Space>) => post<Space>(`/api/inventory/floors/${floorId}/spaces`, body),
  updateSpace: (id: number, body: Partial<Space>) => patch<Space>(`/api/inventory/spaces/${id}`, body),
  deleteSpace: (id: number) => del(`/api/inventory/spaces/${id}`),
  createAsset: (spaceId: number, body: Partial<Asset>) => post<Asset>(`/api/inventory/spaces/${spaceId}/assets`, body),
  updateAsset: (id: number, body: Partial<Asset>) => patch<Asset>(`/api/inventory/assets/${id}`, body),
  deleteAsset: (id: number) => del(`/api/inventory/assets/${id}`),

  live: (at?: string) => get<LiveSnapshot>('/api/telemetry/live', at ? { at } : undefined),
  series: (hours = 24, stepMin = 5, end?: string) =>
    get<{ points: SeriesPoint[]; step_min: number }>('/api/telemetry/series', { hours, step_min: stepMin, end }),
  daily: (days = 30) => get<{ days: DayEnergy[] }>('/api/telemetry/daily', { days }),
  month: () => get<MonthEstimate>('/api/telemetry/month'),

  autoBook: (body: AutoBookingRequest) => post<AutoBookingResult>('/api/bookings/auto', body),
  bookSlot: (slot: SlotOption, req: AutoBookingRequest) =>
    post<BookingRecord>('/api/bookings', {
      classroom_id: slot.classroom_id, date: slot.date, start_time: slot.start_time, end_time: slot.end_time,
      subject: req.subject, expected_students: req.expected_students, notes: req.notes,
      source: 'AUTO', requested_by: req.requested_by,
    }),
  /** weekday as MON..SUN */
  timetable: (weekday: string) => get<TimetableSlot[]>('/api/timetable', { weekday }),
  bookings: (params?: { date?: string; status?: string }) => get<BookingRecord[]>('/api/bookings', params),
  cancelBooking: (id: number) => del<BookingRecord>(`/api/bookings/${id}`),

  /** Switch a room's AC / fans / lights group (simulated until hardware exists). */
  setRoomSwitch: (classroomId: number, body: { ac_on?: boolean; fan_on?: boolean; lights_on?: boolean }) =>
    post(`/api/classrooms/${classroomId}/device-state`, { ...body, source: 'OVERRIDE' }),
  /** Cut a space's switchable loads; stays armed for the rest of today while it's empty. */
  cut: (spaceId: number) => post<{ cut_at: string }>(`/api/telemetry/cut/${spaceId}`),
  releaseCut: (spaceId: number) => del(`/api/telemetry/cut/${spaceId}`),

  savingsDefaults: () => get<SavingsParams>('/api/savings/model/defaults'),
  savingsModel: (params: Partial<SavingsParams>) => post<SavingsResult>('/api/savings/model', params),
};
