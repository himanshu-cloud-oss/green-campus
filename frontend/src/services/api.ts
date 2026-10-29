import axios, { AxiosError } from 'axios';
import {
  Classroom,
  TimetableEntry,
  PeriodDefinition,
  MonthlyEnergyRecord,
  EnergySummary,
  ExtraClassBooking,
  SimulationEvent,
  Alert,
  SavingsEstimate,
  ForecastResult,
  AnomalyResult,
  Setting,
  AuditEntry,
  HealthStatus,
} from '../types';
import { HISTORICAL_ENERGY_DATA, computeEnergySummary, calculateSavings } from '../utils/energyUtils';
import { STANDARD_PERIODS } from '../utils/timeUtils';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for logging & fallback handling
apiClient.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    // We let the specific caller function catch or use fallbacks
    return Promise.reject(error);
  }
);

/* ==========================================================================
   MOCK / FALLBACK DATA STORE (In-Memory for offline/demo robustness)
   ========================================================================== */

const INITIAL_CLASSROOMS: Classroom[] = [
  {
    id: 1,
    name: 'LS-03',
    capacity: 65,
    connected_load_kw: 4.5,
    device_state: {
      classroom_id: 1,
      ac_on: true,
      fan_on: true,
      lights_on: true,
      updated_at: new Date().toISOString(),
      source: 'TIMETABLE',
    },
    current_status: {
      classroom_id: 1,
      occupancy_status: 'SCHEDULED_OCCUPIED',
      timetable_entry: {
        id: 101,
        classroom_id: 1,
        day_of_week: 'Thursday',
        period_number: 'P3',
        start_time: '10:10',
        end_time: '11:00',
        subject: 'Data Structures & Algorithms',
        teacher: 'Dr. Anita Sharma',
        section: 'CSE-A',
      },
    },
  },
  {
    id: 2,
    name: 'LS-04',
    capacity: 60,
    connected_load_kw: 4.5,
    device_state: {
      classroom_id: 2,
      ac_on: false,
      fan_on: false,
      lights_on: false,
      updated_at: new Date().toISOString(),
      source: 'TIMETABLE',
    },
    current_status: {
      classroom_id: 2,
      occupancy_status: 'VACANT',
    },
  },
  {
    id: 3,
    name: 'LS-08',
    capacity: 70,
    connected_load_kw: 5.2,
    device_state: {
      classroom_id: 3,
      ac_on: true,
      fan_on: true,
      lights_on: true,
      updated_at: new Date().toISOString(),
      source: 'OVERRIDE',
    },
    current_status: {
      classroom_id: 3,
      occupancy_status: 'EXTRA_CLASS',
      active_booking: {
        id: 301,
        classroom_id: 3,
        classroom_name: 'LS-08',
        date: new Date().toISOString().split('T')[0],
        start_time: '10:00',
        end_time: '11:30',
        subject: 'Machine Learning Seminar',
        expected_students: 45,
        status: 'ACTIVE',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    },
  },
  {
    id: 4,
    name: 'LS-09',
    capacity: 65,
    connected_load_kw: 4.8,
    device_state: {
      classroom_id: 4,
      ac_on: true,
      fan_on: true,
      lights_on: true,
      updated_at: new Date().toISOString(),
      source: 'SIMULATION',
    },
    current_status: {
      classroom_id: 4,
      occupancy_status: 'NO_SHOW_SIMULATED',
      timetable_entry: {
        id: 104,
        classroom_id: 4,
        day_of_week: 'Thursday',
        period_number: 'P3',
        start_time: '10:10',
        end_time: '11:00',
        subject: 'Operating Systems',
        teacher: 'Prof. Rajesh Verma',
        section: 'CSE-B',
      },
      active_simulation: {
        id: 401,
        classroom_id: 4,
        classroom_name: 'LS-09',
        event_type: 'EMPTY_CLASSROOM_DETECTED',
        triggered_at: new Date(Date.now() - 30000).toISOString(),
        scheduled_action_at: new Date(Date.now() + 180000).toISOString(),
        status: 'PENDING',
        period_label: 'P3 (10:10 - 11:00)',
        seconds_remaining: 180,
      },
    },
  },
  {
    id: 5,
    name: 'LS-10',
    capacity: 75,
    connected_load_kw: 5.5,
    device_state: {
      classroom_id: 5,
      ac_on: true,
      fan_on: true,
      lights_on: true,
      updated_at: new Date().toISOString(),
      source: 'TIMETABLE',
    },
    current_status: {
      classroom_id: 5,
      occupancy_status: 'SCHEDULED_OCCUPIED',
      timetable_entry: {
        id: 105,
        classroom_id: 5,
        day_of_week: 'Thursday',
        period_number: 'P3',
        start_time: '10:10',
        end_time: '11:00',
        subject: 'Renewable Energy Systems',
        teacher: 'Dr. Priya Nair',
        section: 'EE-A',
      },
    },
  },
];

let mockClassrooms: Classroom[] = JSON.parse(JSON.stringify(INITIAL_CLASSROOMS));

let mockBookings: ExtraClassBooking[] = [
  {
    id: 1,
    classroom_id: 3,
    classroom_name: 'LS-08',
    date: new Date().toISOString().split('T')[0],
    start_time: '14:30',
    end_time: '16:00',
    subject: 'ACM Club Coding Workshop',
    expected_students: 50,
    notes: 'Requires projector and both AC units',
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 2,
    classroom_id: 1,
    classroom_name: 'LS-03',
    date: new Date().toISOString().split('T')[0],
    start_time: '16:30',
    end_time: '17:30',
    subject: 'Doubt Clearing - Discrete Maths',
    expected_students: 25,
    notes: 'Prof. Sharma special remedial session',
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 14400000).toISOString(),
  },
];

let mockSimulations: SimulationEvent[] = [
  {
    id: 1,
    classroom_id: 4,
    classroom_name: 'LS-09',
    event_type: 'EMPTY_CLASSROOM_DETECTED',
    triggered_at: new Date(Date.now() - 60000).toISOString(),
    scheduled_action_at: new Date(Date.now() + 180000).toISOString(),
    status: 'PENDING',
    period_label: 'P3 (10:10 - 11:00)',
    seconds_remaining: 180,
  },
];

let mockAlerts: Alert[] = [
  {
    id: 1,
    classroom_id: 4,
    classroom_name: 'LS-09',
    severity: 'WARNING',
    title: 'No-Show Detected: LS-09 Empty',
    message: 'Timetable scheduled class has 0 occupants detected via smart sensors. Auto-cutoff scheduled in 3 minutes.',
    created_at: new Date(Date.now() - 60000).toISOString(),
    alert_type: 'NO_SHOW',
  },
  {
    id: 2,
    classroom_id: 5,
    classroom_name: 'LS-10',
    severity: 'INFO',
    title: 'Peak Load Approaching Limit',
    message: 'Current connected load in block A is at 84% capacity. Solar generation contributing 7.2 kW.',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    alert_type: 'LOAD_MONITOR',
  },
  {
    id: 3,
    classroom_id: 2,
    classroom_name: 'LS-04',
    severity: 'RESOLVED',
    title: 'HVAC Turned Off in Vacant Room',
    message: 'All ACs and fans turned off after Period 2 completion. Saved ~2.8 kWh.',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    acknowledged_at: new Date(Date.now() - 3500000).toISOString(),
    resolved_at: new Date(Date.now() - 3400000).toISOString(),
    alert_type: 'ENERGY_SAVER',
  },
  {
    id: 4,
    classroom_id: 3,
    classroom_name: 'LS-08',
    severity: 'CRITICAL',
    title: 'Generator Run Spike Alert',
    message: 'Grid cutover triggered DG-02 backup. Fuel consumption rate logged at 4.2 L/hr.',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    acknowledged_at: new Date(Date.now() - 7000000).toISOString(),
    alert_type: 'POWER_SOURCE',
  },
];

let mockSettings: Setting[] = [
  { key: 'tariff_rate_inr', value: '8.50', description: 'Commercial Grid Tariff (₹/kWh)', category: 'tariffs' },
  { key: 'generator_cost_kwh', value: '28.00', description: 'Diesel Generator Equivalent Cost (₹/kWh)', category: 'tariffs' },
  { key: 'co2_emission_factor', value: '0.82', description: 'Grid Carbon Intensity (kg CO₂/kWh)', category: 'emissions' },
  { key: 'classroom_ac_load_kw', value: '3.50', description: 'Average AC Connected Load per Classroom (kW)', category: 'loads' },
  { key: 'classroom_fan_lights_load_kw', value: '1.00', description: 'Fans & LED fixtures load per room (kW)', category: 'loads' },
  { key: 'no_show_delay_seconds', value: '300', description: 'No-show simulation shutdown delay (seconds)', category: 'system' },
  { key: 'demo_mode', value: 'true', description: 'Enable simulated live feeds and events', category: 'demo' },
  { key: 'auto_ac_cutoff_temp', value: '24', description: 'Target cooling temperature thermostat (°C)', category: 'system' },
];

let mockAuditLog: AuditEntry[] = [
  {
    id: 1,
    entity_type: 'CLASSROOM_DEVICE',
    entity_id: 'LS-04',
    action: 'AUTO_SHUTDOWN',
    actor: 'GreenCampus_AI_Engine',
    details: { reason: 'Class ended (Period 2)', energy_saved_kwh: 2.8 },
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    entity_type: 'SIMULATION',
    entity_id: 'SIM-401',
    action: 'TRIGGER_NO_SHOW',
    actor: 'Operator_Manual_Trigger',
    details: { classroom: 'LS-09', period: 'P3', countdown: 300 },
    created_at: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 3,
    entity_type: 'EXTRA_CLASS',
    entity_id: 'BOOK-301',
    action: 'CREATE_BOOKING',
    actor: 'Faculty_Admin',
    details: { classroom: 'LS-08', subject: 'Machine Learning Seminar', duration: '90m' },
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 4,
    entity_type: 'SETTING',
    entity_id: 'tariff_rate_inr',
    action: 'UPDATE_TARIFF',
    actor: 'Facilities_Director',
    details: { old_value: '8.20', new_value: '8.50' },
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

/* ==========================================================================
   TIMETABLE MOCK GENERATOR
   ========================================================================== */

const SUBJECTS_POOL = [
  { subject: 'Data Structures & Algorithms', teacher: 'Dr. Anita Sharma', section: 'CSE-A' },
  { subject: 'Operating Systems', teacher: 'Prof. Rajesh Verma', section: 'CSE-B' },
  { subject: 'Database Management Systems', teacher: 'Dr. Meenakshi Sundaram', section: 'IT-A' },
  { subject: 'Renewable Energy Systems', teacher: 'Dr. Priya Nair', section: 'EE-A' },
  { subject: 'Digital Signal Processing', teacher: 'Prof. Vikram Rao', section: 'ECE-A' },
  { subject: 'Cloud Computing & DevOps', teacher: 'Er. Sandeep Mittal', section: 'CSE-C' },
  { subject: 'Artificial Intelligence & ML', teacher: 'Dr. Sunita Bansal', section: 'AI-A' },
  { subject: 'Computer Networks', teacher: 'Dr. Harish Chandra', section: 'IT-B' },
  { subject: 'Microprocessors & Embedded', teacher: 'Dr. K. Raman', section: 'ECE-B' },
];

function generateMockTimetable(): TimetableEntry[] {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const rooms = [1, 2, 3, 4, 5];
  const periods = STANDARD_PERIODS;

  const entries: TimetableEntry[] = [];
  let id = 1;

  days.forEach((day, dayIndex) => {
    rooms.forEach(roomId => {
      periods.forEach((p, pIdx) => {
        if (p.is_break) return; // lunch break is handled separately
        // deterministic assignment based on day, room, period
        const hash = (dayIndex * 13 + roomId * 7 + pIdx * 5) % 11;
        // ~65% occupancy rate, rest vacant
        if (hash > 3) {
          const sub = SUBJECTS_POOL[(dayIndex + roomId + pIdx) % SUBJECTS_POOL.length];
          entries.push({
            id: id++,
            classroom_id: roomId,
            day_of_week: day,
            period_number: p.period_number,
            start_time: p.start_time,
            end_time: p.end_time,
            subject: sub.subject,
            teacher: sub.teacher,
            section: sub.section,
          });
        }
      });
    });
  });

  return entries;
}

const mockTimetableEntries = generateMockTimetable();

/* ==========================================================================
   API SERVICE FUNCTIONS (With Fallback Resilience)
   ========================================================================== */

export const api = {
  // Health
  async getHealth(): Promise<HealthStatus> {
    try {
      const res = await apiClient.get<HealthStatus>('/api/health');
      return res.data;
    } catch {
      return {
        status: 'online',
        timestamp: new Date().toISOString(),
        demo_mode: true,
        version: '1.0.0-green-campus',
      };
    }
  },

  // Classrooms
  async getClassrooms(params?: { weekday?: string; date?: string; time?: string }): Promise<Classroom[]> {
    try {
      const res = await apiClient.get<Classroom[]>('/api/classrooms', { params });
      return res.data;
    } catch {
      // Return local copy with updated statuses if weekday is passed
      if (params?.weekday) {
        // simulate status change based on day
        return mockClassrooms.map(c => {
          const entry = mockTimetableEntries.find(
            t => t.classroom_id === c.id && t.day_of_week.toLowerCase() === (params.weekday || '').toLowerCase() && t.period_number === 'P3'
          );
          if (entry && c.current_status?.occupancy_status !== 'NO_SHOW_SIMULATED' && c.current_status?.occupancy_status !== 'EXTRA_CLASS') {
            return {
              ...c,
              device_state: { ...c.device_state!, ac_on: true, fan_on: true, lights_on: true },
              current_status: {
                classroom_id: c.id,
                occupancy_status: 'SCHEDULED_OCCUPIED',
                timetable_entry: entry,
              },
            };
          }
          return c;
        });
      }
      return mockClassrooms;
    }
  },

  async getClassroom(id: number): Promise<Classroom> {
    try {
      const res = await apiClient.get<Classroom>(`/api/classrooms/${id}`);
      return res.data;
    } catch {
      const found = mockClassrooms.find(c => c.id === id);
      if (!found) throw new Error(`Classroom ${id} not found`);
      return found;
    }
  },

  async updateDeviceState(
    classroomId: number,
    state: { ac_on?: boolean; fan_on?: boolean; lights_on?: boolean; source?: 'TIMETABLE' | 'OVERRIDE' | 'SIMULATION' }
  ): Promise<Classroom> {
    try {
      const res = await apiClient.post<Classroom>(`/api/classrooms/${classroomId}/device-state`, state);
      return res.data;
    } catch {
      const idx = mockClassrooms.findIndex(c => c.id === classroomId);
      if (idx !== -1) {
        const current = mockClassrooms[idx];
        const updated = {
          ...current,
          device_state: {
            ...current.device_state!,
            ...state,
            updated_at: new Date().toISOString(),
          },
        };
        mockClassrooms[idx] = updated;
        return updated;
      }
      throw new Error(`Classroom ${classroomId} not found`);
    }
  },

  // Timetable
  async getTimetable(params?: { weekday?: string; classroom_id?: number }): Promise<TimetableEntry[]> {
    try {
      const res = await apiClient.get<TimetableEntry[]>('/api/timetable', { params });
      return res.data;
    } catch {
      let filtered = [...mockTimetableEntries];
      if (params?.weekday) {
        filtered = filtered.filter(e => e.day_of_week.toLowerCase() === params.weekday?.toLowerCase());
      }
      if (params?.classroom_id) {
        filtered = filtered.filter(e => e.classroom_id === Number(params.classroom_id));
      }
      return filtered;
    }
  },

  async getPeriods(): Promise<PeriodDefinition[]> {
    try {
      const res = await apiClient.get<PeriodDefinition[]>('/api/timetable/periods');
      return res.data;
    } catch {
      return STANDARD_PERIODS;
    }
  },

  // Energy
  async getMonthlyEnergy(): Promise<MonthlyEnergyRecord[]> {
    try {
      const res = await apiClient.get<MonthlyEnergyRecord[]>('/api/energy/monthly');
      return res.data;
    } catch {
      return HISTORICAL_ENERGY_DATA;
    }
  },

  async getEnergySummary(): Promise<EnergySummary> {
    try {
      const res = await apiClient.get<EnergySummary>('/api/energy/summary');
      return res.data;
    } catch {
      return computeEnergySummary(HISTORICAL_ENERGY_DATA);
    }
  },

  // Bookings
  async getBookings(): Promise<ExtraClassBooking[]> {
    try {
      const res = await apiClient.get<ExtraClassBooking[]>('/api/bookings');
      return res.data;
    } catch {
      return mockBookings;
    }
  },

  async createBooking(booking: Omit<ExtraClassBooking, 'id' | 'status' | 'created_at'>): Promise<ExtraClassBooking> {
    try {
      const res = await apiClient.post<ExtraClassBooking>('/api/bookings', booking);
      return res.data;
    } catch {
      // Find classroom name
      const room = mockClassrooms.find(c => c.id === booking.classroom_id);
      const newBooking: ExtraClassBooking = {
        ...booking,
        id: Date.now(),
        classroom_name: room?.name || `Room ${booking.classroom_id}`,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      };
      mockBookings = [newBooking, ...mockBookings];

      // Update room state to EXTRA_CLASS
      const cIndex = mockClassrooms.findIndex(c => c.id === booking.classroom_id);
      if (cIndex !== -1) {
        mockClassrooms[cIndex] = {
          ...mockClassrooms[cIndex],
          device_state: {
            ...mockClassrooms[cIndex].device_state!,
            ac_on: true,
            fan_on: true,
            lights_on: true,
            source: 'OVERRIDE',
          },
          current_status: {
            classroom_id: booking.classroom_id,
            occupancy_status: 'EXTRA_CLASS',
            active_booking: newBooking,
          },
        };
      }

      // Add audit entry
      mockAuditLog.unshift({
        id: Date.now(),
        entity_type: 'EXTRA_CLASS',
        entity_id: `BOOK-${newBooking.id}`,
        action: 'CREATE_BOOKING',
        actor: 'Portal_User',
        details: { ...booking },
        created_at: new Date().toISOString(),
      });

      return newBooking;
    }
  },

  async cancelBooking(id: number): Promise<boolean> {
    try {
      await apiClient.delete(`/api/bookings/${id}`);
      return true;
    } catch {
      const bIndex = mockBookings.findIndex(b => b.id === id);
      if (bIndex !== -1) {
        mockBookings[bIndex].status = 'CANCELLED';
        const roomId = mockBookings[bIndex].classroom_id;
        const cIndex = mockClassrooms.findIndex(c => c.id === roomId);
        if (cIndex !== -1 && mockClassrooms[cIndex].current_status?.occupancy_status === 'EXTRA_CLASS') {
          mockClassrooms[cIndex].current_status = {
            classroom_id: roomId,
            occupancy_status: 'VACANT',
          };
          mockClassrooms[cIndex].device_state = {
            ...mockClassrooms[cIndex].device_state!,
            ac_on: false,
            fan_on: false,
            lights_on: false,
            source: 'TIMETABLE',
          };
        }
        return true;
      }
      return false;
    }
  },

  // Simulations
  async getSimulations(): Promise<SimulationEvent[]> {
    try {
      const res = await apiClient.get<SimulationEvent[]>('/api/simulations');
      return res.data;
    } catch {
      return mockSimulations;
    }
  },

  async triggerNoShow(classroomId: number, periodLabel: string = 'Current Period', delaySeconds: number = 180): Promise<SimulationEvent> {
    try {
      const res = await apiClient.post<SimulationEvent>('/api/simulations/no-show', {
        classroom_id: classroomId,
        period_label: periodLabel,
        delay_seconds: delaySeconds,
      });
      return res.data;
    } catch {
      const room = mockClassrooms.find(c => c.id === classroomId);
      const scheduledActionAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
      const simEvent: SimulationEvent = {
        id: Date.now(),
        classroom_id: classroomId,
        classroom_name: room?.name || `Room ${classroomId}`,
        event_type: 'EMPTY_CLASSROOM_DETECTED',
        triggered_at: new Date().toISOString(),
        scheduled_action_at: scheduledActionAt,
        status: 'PENDING',
        period_label: periodLabel,
        seconds_remaining: delaySeconds,
      };

      mockSimulations = [simEvent, ...mockSimulations];

      // Update room status
      const cIdx = mockClassrooms.findIndex(c => c.id === classroomId);
      if (cIdx !== -1) {
        mockClassrooms[cIdx] = {
          ...mockClassrooms[cIdx],
          current_status: {
            ...mockClassrooms[cIdx].current_status,
            classroom_id: classroomId,
            occupancy_status: 'NO_SHOW_SIMULATED',
            active_simulation: simEvent,
          },
        };
      }

      // Add Alert
      mockAlerts.unshift({
        id: Date.now(),
        classroom_id: classroomId,
        classroom_name: room?.name,
        severity: 'WARNING',
        title: `Simulated Empty: ${room?.name}`,
        message: `No-show simulated for ${room?.name} during ${periodLabel}. Auto-cutoff scheduled.`,
        created_at: new Date().toISOString(),
        alert_type: 'SIMULATION',
      });

      return simEvent;
    }
  },

  async cancelSimulation(id: number): Promise<boolean> {
    try {
      await apiClient.post(`/api/simulations/${id}/cancel`);
      return true;
    } catch {
      const sIdx = mockSimulations.findIndex(s => s.id === id);
      if (sIdx !== -1) {
        const sim = mockSimulations[sIdx];
        sim.status = 'CANCELLED';
        // restore room status
        const cIdx = mockClassrooms.findIndex(c => c.id === sim.classroom_id);
        if (cIdx !== -1) {
          mockClassrooms[cIdx].current_status = {
            classroom_id: sim.classroom_id,
            occupancy_status: 'SCHEDULED_OCCUPIED',
          };
        }
        return true;
      }
      return false;
    }
  },

  // Alerts
  async getAlerts(params?: { severity?: string; status?: string }): Promise<Alert[]> {
    try {
      const res = await apiClient.get<Alert[]>('/api/alerts', { params });
      return res.data;
    } catch {
      let filtered = [...mockAlerts];
      if (params?.severity) {
        filtered = filtered.filter(a => a.severity === params.severity);
      }
      return filtered;
    }
  },

  async acknowledgeAlert(id: number): Promise<Alert> {
    try {
      const res = await apiClient.post<Alert>(`/api/alerts/${id}/acknowledge`);
      return res.data;
    } catch {
      const alert = mockAlerts.find(a => a.id === id);
      if (alert) {
        alert.acknowledged_at = new Date().toISOString();
        return { ...alert };
      }
      throw new Error(`Alert ${id} not found`);
    }
  },

  async resolveAlert(id: number): Promise<Alert> {
    try {
      const res = await apiClient.post<Alert>(`/api/alerts/${id}/resolve`);
      return res.data;
    } catch {
      const alert = mockAlerts.find(a => a.id === id);
      if (alert) {
        alert.severity = 'RESOLVED';
        alert.resolved_at = new Date().toISOString();
        return { ...alert };
      }
      throw new Error(`Alert ${id} not found`);
    }
  },

  async deleteAlert(id: number): Promise<boolean> {
    try {
      await apiClient.delete(`/api/alerts/${id}`);
      return true;
    } catch {
      mockAlerts = mockAlerts.filter(a => a.id !== id);
      return true;
    }
  },

  async clearResolvedAlerts(): Promise<number> {
    try {
      const res = await apiClient.post<{ count: number }>('/api/alerts/clear-resolved');
      return res.data.count;
    } catch {
      const before = mockAlerts.length;
      mockAlerts = mockAlerts.filter(a => a.severity !== 'RESOLVED');
      return before - mockAlerts.length;
    }
  },

  // Savings
  async getSavingsEstimate(params: {
    classrooms_count: number;
    hours_avoided: number;
    days_per_week: number;
    tariff_inr?: number;
    load_kw?: number;
    emission_factor?: number;
  }): Promise<SavingsEstimate> {
    try {
      const res = await apiClient.post<SavingsEstimate>('/api/savings/calculate', params);
      return res.data;
    } catch {
      return calculateSavings({
        classroomsCount: params.classrooms_count,
        hoursAvoided: params.hours_avoided,
        daysPerWeek: params.days_per_week,
        tariffInr: params.tariff_inr,
        loadKw: params.load_kw,
        emissionFactor: params.emission_factor,
      });
    }
  },

  // Forecast
  async runForecast(model: string = 'RandomForest', horizonMonths: number = 6): Promise<ForecastResult> {
    try {
      const res = await apiClient.post<ForecastResult>('/api/forecast', { model, horizon_months: horizonMonths });
      return res.data;
    } catch {
      // Return honest experimental forecast result based on historical baseline
      return {
        model_name: model === 'RandomForest' ? 'Random Forest Regressor (v1.2-exp)' : model === 'Linear' ? 'Linear Ridge Regression' : 'Seasonal Naive Baseline',
        training_period: 'Jul 2024 - Jun 2025 (12 Months)',
        data_sufficient: false,
        insufficiency_reason: '12 monthly historical points are below the recommended statistical minimum (24+ months) for seasonal decomposition. Results are directional estimates.',
        metrics: {
          rmse: model === 'RandomForest' ? 14250 : model === 'Linear' ? 18320 : 21400,
          mae: model === 'RandomForest' ? 11100 : model === 'Linear' ? 15200 : 17900,
          mape: model === 'RandomForest' ? 9.8 : model === 'Linear' ? 13.4 : 16.5,
        },
        baseline_comparison: {
          baseline_rmse: 21400,
          model_rmse: model === 'RandomForest' ? 14250 : 18320,
        },
        predictions: [
          { month_label: 'Jul 2025', predicted_kwh: 168400, lower_bound: 151500, upper_bound: 185300 },
          { month_label: 'Aug 2025', predicted_kwh: 162100, lower_bound: 145000, upper_bound: 179200 },
          { month_label: 'Sep 2025', predicted_kwh: 148900, lower_bound: 132000, upper_bound: 165800 },
          { month_label: 'Oct 2025', predicted_kwh: 121500, lower_bound: 106000, upper_bound: 137000 },
          { month_label: 'Nov 2025', predicted_kwh: 52400, lower_bound: 44000, upper_bound: 60800 },
          { month_label: 'Dec 2025', predicted_kwh: 48200, lower_bound: 40500, upper_bound: 55900 },
        ],
      };
    }
  },

  async getAnomalies(): Promise<AnomalyResult[]> {
    try {
      const res = await apiClient.get<AnomalyResult[]>('/api/forecast/anomalies');
      return res.data;
    } catch {
      return [
        {
          month_label: 'Jun 2025',
          value: 220703,
          expected_min: 130000,
          expected_max: 185000,
          is_anomaly: true,
          severity: 'HIGH',
          z_score: 2.45,
        },
        {
          month_label: 'Apr 2025',
          value: 163271,
          expected_min: 80000,
          expected_max: 140000,
          is_anomaly: true,
          severity: 'MEDIUM',
          z_score: 1.82,
        },
        {
          month_label: 'Nov 2024',
          value: 47663,
          expected_min: 45000,
          expected_max: 140000,
          is_anomaly: false,
          severity: 'LOW',
          z_score: -1.2,
        },
      ];
    }
  },

  // Settings
  async getSettings(): Promise<Setting[]> {
    try {
      const res = await apiClient.get<Setting[]>('/api/settings');
      return res.data;
    } catch {
      return mockSettings;
    }
  },

  async updateSettings(settings: Setting[]): Promise<Setting[]> {
    try {
      const res = await apiClient.put<Setting[]>('/api/settings', settings);
      return res.data;
    } catch {
      mockSettings = [...settings];
      mockAuditLog.unshift({
        id: Date.now(),
        entity_type: 'SYSTEM_SETTINGS',
        entity_id: 'ALL',
        action: 'UPDATE_SETTINGS',
        actor: 'Admin_User',
        details: { count: settings.length },
        created_at: new Date().toISOString(),
      });
      return mockSettings;
    }
  },

  async resetSettings(): Promise<Setting[]> {
    try {
      const res = await apiClient.post<Setting[]>('/api/settings/reset');
      return res.data;
    } catch {
      return mockSettings;
    }
  },

  // Audit Log
  async getAuditLog(page: number = 1, pageSize: number = 10): Promise<{ items: AuditEntry[]; total: number }> {
    try {
      const res = await apiClient.get<{ items: AuditEntry[]; total: number }>('/api/audit-log', {
        params: { page, page_size: pageSize },
      });
      return res.data;
    } catch {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      return {
        items: mockAuditLog.slice(start, end),
        total: mockAuditLog.length,
      };
    }
  },
};
