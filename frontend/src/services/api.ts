/**
 * Typed client for the classroom, timetable, alerts, settings and reporting
 * endpoints. No offline fallbacks: when the backend is down, calls fail and the
 * page says so, rather than showing invented rooms or numbers.
 */
import axios from 'axios';
import {
  Classroom,
  ClassroomStatus,
  TimetableEntry,
  PeriodDefinition,
  MonthlyEnergyRecord,
  EnergySummary,
  ExtraClassBooking,
  SimulationEvent,
  Alert,
  ForecastResult,
  AnomalyResult,
  Setting,
  AuditEntry,
  HealthStatus,
} from '../types';

// Same origin everywhere: in dev Vite proxies /api to the backend (so other devices on the LAN work),
// in production Vercel serves /api/*. Set VITE_API_URL only to point at a separate backend.
const API_BASE = import.meta.env.VITE_API_URL ?? '';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '');

/** Room names keyed by classroom id, fetched once and reused to label alerts and bookings. */
let roomNames: Promise<Record<number, string>> | null = null;
function getRoomNames(): Promise<Record<number, string>> {
  if (!roomNames) {
    roomNames = apiClient
      .get<Classroom[]>('/api/classrooms')
      .then(r => Object.fromEntries(r.data.map(c => [c.id, c.name])))
      .catch(err => {
        roomNames = null;
        throw err;
      });
  }
  return roomNames;
}

type RawEntry = Omit<TimetableEntry, 'start_time' | 'end_time'> & { start_time: string; end_time: string };
const normEntry = (e: RawEntry): TimetableEntry => ({ ...e, start_time: hhmm(e.start_time), end_time: hhmm(e.end_time) });

type RawBooking = ExtraClassBooking;
const normBooking = (b: RawBooking, names: Record<number, string>): ExtraClassBooking => ({
  ...b,
  start_time: hhmm(b.start_time),
  end_time: hhmm(b.end_time),
  classroom_name: names[b.classroom_id] ?? `Room ${b.classroom_id}`,
});

type RawMonth = Omit<MonthlyEnergyRecord, 'month_label' | 'mom_change_pct'>;

type RawAudit = Omit<AuditEntry, 'details'> & { details_json?: string | null };

export const api = {
  async getHealth(): Promise<HealthStatus> {
    return (await apiClient.get<HealthStatus>('/api/health')).data;
  },

  /** The bookable rooms, without live status. */
  async listClassrooms(): Promise<Classroom[]> {
    return (await apiClient.get<Classroom[]>('/api/classrooms')).data;
  },

  /**
   * Every room with its status from /api/classrooms/{id}/status: occupancy from the
   * timetable and bookings, simulated device state and kW. Defaults to now.
   */
  async getClassrooms(params?: { date?: string; time?: string }): Promise<Classroom[]> {
    const rooms = (await apiClient.get<Classroom[]>('/api/classrooms')).data;
    return Promise.all(
      rooms.map(async c => {
        const s = (
          await apiClient.get<ClassroomStatus & { device_state?: Classroom['device_state'] }>(
            `/api/classrooms/${c.id}/status`,
            { params: { date: params?.date, time: params?.time } }
          )
        ).data;
        return {
          ...c,
          device_state: s.device_state ?? c.device_state,
          current_status: {
            ...s,
            timetable_entry: s.timetable_entry ? normEntry(s.timetable_entry as RawEntry) : undefined,
            active_booking: s.active_booking ?? undefined,
          },
        };
      })
    );
  },

  async updateDeviceState(
    classroomId: number,
    state: { ac_on?: boolean; fan_on?: boolean; lights_on?: boolean; source?: 'TIMETABLE' | 'OVERRIDE' | 'SIMULATION' }
  ) {
    return (await apiClient.post(`/api/classrooms/${classroomId}/device-state`, state)).data;
  },

  // Timetable
  async getTimetable(params?: { weekday?: string; classroom_id?: number }): Promise<TimetableEntry[]> {
    const weekday = params?.weekday ? params.weekday.slice(0, 3).toUpperCase() : undefined;
    const res = await apiClient.get<RawEntry[]>('/api/timetable', { params: { ...params, weekday } });
    return res.data.map(normEntry);
  },

  async getPeriods(): Promise<PeriodDefinition[]> {
    const res = await apiClient.get<(PeriodDefinition & { is_lunch?: boolean })[]>('/api/timetable/periods');
    return res.data.map(p => ({ ...p, is_break: p.is_break ?? !!p.is_lunch }));
  },

  // Campus billing (real, campus-wide)
  async getMonthlyEnergy(): Promise<MonthlyEnergyRecord[]> {
    const res = await apiClient.get<RawMonth[]>('/api/energy/monthly');
    return res.data.map((r, i, all) => {
      const prev = all[i - 1];
      return {
        ...r,
        month_label: `${MONTHS[r.month - 1]} ${r.year}`,
        mom_change_pct: prev ? Math.round(((r.total_kwh - prev.total_kwh) / prev.total_kwh) * 1000) / 10 : undefined,
      };
    });
  },

  async getEnergySummary(): Promise<EnergySummary> {
    return (await apiClient.get<EnergySummary>('/api/energy/summary')).data;
  },

  // Bookings
  async getBookings(): Promise<ExtraClassBooking[]> {
    const [res, names] = await Promise.all([apiClient.get<RawBooking[]>('/api/bookings'), getRoomNames()]);
    return res.data.map(b => normBooking(b, names));
  },

  async createBooking(booking: Omit<ExtraClassBooking, 'id' | 'status' | 'created_at'>): Promise<ExtraClassBooking> {
    const [res, names] = await Promise.all([apiClient.post<RawBooking>('/api/bookings', booking), getRoomNames()]);
    return normBooking(res.data, names);
  },

  async cancelBooking(id: number): Promise<void> {
    await apiClient.delete(`/api/bookings/${id}`);
  },

  // No-show tests (there are no occupancy sensors; a no-show is started by hand)
  async getSimulations(): Promise<SimulationEvent[]> {
    const [res, names] = await Promise.all([apiClient.get<SimulationEvent[]>('/api/simulations'), getRoomNames()]);
    return res.data.map(s => ({ ...s, classroom_name: names[s.classroom_id] ?? `Room ${s.classroom_id}` }));
  },

  async triggerNoShow(classroomId: number, periodLabel: string, slotStart: string, slotEnd: string): Promise<SimulationEvent> {
    const res = await apiClient.post<SimulationEvent>('/api/simulations/no-show', {
      classroom_id: classroomId,
      period_label: periodLabel,
      slot_start: slotStart,
      slot_end: slotEnd,
    });
    const names = await getRoomNames();
    return { ...res.data, classroom_name: names[classroomId] };
  },

  async cancelSimulation(id: number): Promise<void> {
    await apiClient.patch(`/api/simulations/${id}/cancel`);
  },

  async executeSimulation(id: number): Promise<void> {
    await apiClient.patch(`/api/simulations/${id}/execute`);
  },

  /** Ask the backend to carry out any no-show cut-offs whose countdown has run out. */
  async processCountdowns(): Promise<void> {
    await apiClient.post('/api/simulations/update-countdowns');
  },

  // Alerts
  async getAlerts(params?: { severity?: string }): Promise<Alert[]> {
    const [res, names] = await Promise.all([apiClient.get<Alert[]>('/api/alerts', { params }), getRoomNames()]);
    return res.data.map(a => ({ ...a, classroom_name: a.classroom_id ? names[a.classroom_id] : undefined }));
  },

  async acknowledgeAlert(id: number): Promise<Alert> {
    return (await apiClient.patch<Alert>(`/api/alerts/${id}`, { acknowledged: true })).data;
  },

  async resolveAlert(id: number): Promise<Alert> {
    return (await apiClient.patch<Alert>(`/api/alerts/${id}`, { resolved: true })).data;
  },

  async deleteAlert(id: number): Promise<void> {
    await apiClient.delete(`/api/alerts/${id}`);
  },

  // Forecast (page not routed yet)
  async runForecast(model: string = 'RandomForest', horizonMonths: number = 6): Promise<ForecastResult> {
    return (await apiClient.post<ForecastResult>('/api/forecast', { model, horizon_months: horizonMonths })).data;
  },

  async getAnomalies(): Promise<AnomalyResult[]> {
    return (await apiClient.get<AnomalyResult[]>('/api/forecast/anomalies')).data;
  },

  // Settings
  async getSettings(): Promise<Setting[]> {
    return (await apiClient.get<Setting[]>('/api/settings')).data;
  },

  async updateSetting(key: string, value: string): Promise<Setting> {
    return (await apiClient.patch<Setting>(`/api/settings/${encodeURIComponent(key)}`, { value })).data;
  },

  // Change log
  async getAuditLog(limit: number = 200): Promise<AuditEntry[]> {
    const res = await apiClient.get<RawAudit[]>('/api/audit-log', { params: { limit } });
    return res.data.map(({ details_json, ...a }) => {
      let details: Record<string, unknown> = {};
      try {
        details = details_json ? JSON.parse(details_json) : {};
      } catch {
        details = { raw: details_json };
      }
      return { ...a, entity_id: a.entity_id ?? '', details };
    });
  },
};
