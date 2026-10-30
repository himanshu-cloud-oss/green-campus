// Classrooms
export interface Classroom {
  id: number;
  name: string;
  capacity: number;
  connected_load_kw: number;
  device_state?: DeviceState;
  current_status?: ClassroomStatus;
}

/** Status from /api/classrooms/{id}/status. */
export type RoomStatus = 'OCCUPIED' | 'BOOKED_EXTRA_CLASS' | 'VACANT' | 'LUNCH' | 'AFTER_HOURS';

export interface ClassroomStatus {
  classroom_id: number;
  name: string;
  status: RoomStatus;
  current_period?: PeriodDefinition | null;
  timetable_entry?: TimetableEntry;
  active_booking?: ExtraClassBooking;
  /** Simulated draw from the device inventory and behaviour model. */
  energy_draw_kw: number;
  waste_detected: boolean;
  waste_reason?: string | null;
}

// Device State
export interface DeviceState {
  classroom_id: number;
  ac_on: boolean;
  fan_on: boolean;
  lights_on: boolean;
  updated_at?: string;
  source: string;
}

// Timetable
export interface TimetableEntry {
  id: number;
  classroom_id: number;
  day_of_week: string; // "Monday", "Tuesday", etc.
  period_number: string; // "P1", "P2", ..., "LUNCH"
  start_time: string; // "09:00"
  end_time: string; // "09:50"
  subject: string;
  teacher: string;
  section?: string;
}

export interface PeriodDefinition {
  period_number: string;
  label: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
}

// Energy
export interface MonthlyEnergyRecord {
  id: number;
  month: number;
  year: number;
  month_label: string; // "Jul 2024"
  grid_kwh: number;
  generator_kwh: number;
  solar_kwh: number;
  total_kwh: number;
  mom_change_pct?: number;
}

export interface EnergySummary {
  peak_month: MonthlyEnergyRecord;
  lowest_month: MonthlyEnergyRecord;
  total_grid: number;
  total_generator: number;
  total_solar: number;
  total_all: number;
  avg_monthly: number;
  data_quality_ok: boolean;
  quality_issues: string[];
}

// Bookings
export interface ExtraClassBooking {
  id: number;
  classroom_id: number;
  classroom_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  subject?: string;
  expected_students?: number;
  notes?: string;
  status: 'ACTIVE' | 'CANCELLED';
  created_at: string;
}

// Simulations
export interface SimulationEvent {
  id: number;
  classroom_id: number;
  classroom_name?: string;
  event_type: string;
  triggered_at: string;
  scheduled_action_at: string;
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED';
  period_label: string;
  notes?: string | null;
  seconds_remaining?: number;
}

// Alerts
export interface Alert {
  id: number;
  classroom_id?: number;
  classroom_name?: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'RESOLVED';
  title: string;
  message: string;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  alert_type: string;
}

// Savings
export interface SavingsEstimate {
  energy_saved_kwh: number;
  cost_saved_inr: number;
  co2_avoided_kg: number;
  classrooms_count: number;
  hours_avoided: number;
  tariff_used: number;
  load_kw_used: number;
  emission_factor_used: number;
  weekly_energy_kwh: number;
  monthly_energy_kwh: number;
  weekly_cost_inr: number;
  monthly_cost_inr: number;
  assumptions: string[];
}

// Forecast
export interface ForecastPrediction {
  month_label: string;
  predicted_kwh: number;
  lower_bound?: number;
  upper_bound?: number;
}

export interface ForecastResult {
  model_name: string;
  training_period: string;
  predictions: ForecastPrediction[];
  metrics?: {
    rmse: number;
    mae: number;
    mape?: number;
  };
  data_sufficient: boolean;
  insufficiency_reason?: string;
  baseline_comparison?: {
    baseline_rmse: number;
    model_rmse: number;
  };
}

export interface AnomalyResult {
  month_label: string;
  value: number;
  expected_min: number;
  expected_max: number;
  is_anomaly: boolean;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  z_score: number;
}

// Settings
export interface Setting {
  key: string;
  value: string;
  description: string;
  category?: 'tariffs' | 'emissions' | 'loads' | 'system' | 'demo';
}

// Audit Log
export interface AuditEntry {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  details: Record<string, unknown>;
  created_at: string;
}

// System Health
export interface HealthStatus {
  status: string;
  timestamp: string;
  demo_mode: boolean;
  version?: string;
}
