"""Pydantic schemas for data validation and API serialization."""
from datetime import date, time, datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict, model_validator


# -----------------------------------------------------------------------------
# Common / System Schemas
# -----------------------------------------------------------------------------

class HealthResponse(BaseModel):
    """System health check schema."""
    status: str = "ok"
    timestamp: datetime
    db_status: str
    demo_mode: bool
    version: str


class SettingBase(BaseModel):
    """System setting base."""
    key: str
    value: str
    description: Optional[str] = None


class SettingUpdate(BaseModel):
    """Schema for updating a setting value."""
    value: str


class SettingOut(SettingBase):
    """Schema for returning a setting."""
    id: int
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AuditLogOut(BaseModel):
    """Schema for returning audit trail entries."""
    id: int
    entity_type: str
    entity_id: Optional[str] = None
    action: str
    actor: str
    details_json: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# Device State Schemas
# -----------------------------------------------------------------------------

class DeviceStateBase(BaseModel):
    """Base schema for classroom electrical device states."""
    ac_on: bool = False
    fan_on: bool = False
    lights_on: bool = False
    source: str = "TIMETABLE"


class DeviceStateUpdate(BaseModel):
    """Schema for updating classroom devices."""
    ac_on: Optional[bool] = None
    fan_on: Optional[bool] = None
    lights_on: Optional[bool] = None
    source: Optional[str] = "OVERRIDE"


class DeviceStateOut(DeviceStateBase):
    """Schema for returning device state."""
    id: int
    classroom_id: int
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# Timetable & Period Schemas
# -----------------------------------------------------------------------------

class PeriodDefinition(BaseModel):
    """Academic timetable period specification."""
    period_number: str
    label: str
    start_time: str
    end_time: str
    is_lunch: bool = False


class TimetableEntryBase(BaseModel):
    """Base timetable entry."""
    classroom_id: int
    day_of_week: str
    period_number: str
    start_time: time
    end_time: time
    subject: str
    teacher: str
    section: str
    demo_data: bool = True


class TimetableEntryCreate(TimetableEntryBase):
    """Schema for adding a new timetable entry."""
    pass


class TimetableEntryOut(TimetableEntryBase):
    """Schema for returning a timetable entry."""
    id: int
    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# Classroom Schemas
# -----------------------------------------------------------------------------

class ClassroomBase(BaseModel):
    """Classroom base definition."""
    name: str
    building: str = "Engineering Block"
    floor: int = 1
    capacity: int = 60
    connected_load_kw: float = 2.4


class ClassroomCreate(ClassroomBase):
    """Classroom creation schema."""
    pass


class ClassroomOut(ClassroomBase):
    """Classroom full detail output."""
    id: int
    device_state: Optional[DeviceStateOut] = None
    model_config = ConfigDict(from_attributes=True)


class ClassroomStatusOut(BaseModel):
    """Live occupancy and power status of a classroom."""
    classroom_id: int
    name: str
    status: str  # OCCUPIED, VACANT, LUNCH, BOOKED_EXTRA_CLASS, AFTER_HOURS
    current_period: Optional[PeriodDefinition] = None
    timetable_entry: Optional[TimetableEntryOut] = None
    active_booking: Optional[Any] = None  # BookingOut
    device_state: Optional[DeviceStateOut] = None
    energy_draw_kw: float
    waste_detected: bool
    waste_reason: Optional[str] = None


# -----------------------------------------------------------------------------
# Extra Class Bookings Schemas
# -----------------------------------------------------------------------------

class BookingBase(BaseModel):
    """Base schema for classroom bookings."""
    classroom_id: int
    date: date
    start_time: time
    end_time: time
    subject: str
    expected_students: int = 30
    notes: Optional[str] = None


class BookingCreate(BookingBase):
    """Schema to create a classroom booking with start/end time validation."""
    @model_validator(mode="after")
    def validate_times(self) -> "BookingCreate":
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be strictly earlier than end_time")
        return self


class BookingUpdate(BaseModel):
    """Schema to update a classroom booking."""
    subject: Optional[str] = None
    expected_students: Optional[int] = None
    notes: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    status: Optional[str] = None

    @model_validator(mode="after")
    def validate_times(self) -> "BookingUpdate":
        if self.start_time is not None and self.end_time is not None:
            if self.start_time >= self.end_time:
                raise ValueError("start_time must be strictly earlier than end_time")
        return self


class BookingOut(BookingBase):
    """Schema for returning a booking."""
    id: int
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# Simulation Schemas
# -----------------------------------------------------------------------------

class NoShowSimulationCreate(BaseModel):
    """Trigger payload for a no-show classroom simulation."""
    classroom_id: int
    period_label: str
    slot_start: str
    slot_end: str
    notes: Optional[str] = None


class SimulationEventOut(BaseModel):
    """Output schema for a simulation event."""
    id: int
    classroom_id: int
    event_type: str
    triggered_at: datetime
    scheduled_action_at: datetime
    status: str
    period_label: str
    notes: Optional[str] = None
    seconds_remaining: float = 0.0
    model_config = ConfigDict(from_attributes=True)


class CountdownUpdateResult(BaseModel):
    """Result of automated countdown processing."""
    checked_count: int
    executed_count: int
    executed_events: List[SimulationEventOut]


# -----------------------------------------------------------------------------
# Alert Schemas
# -----------------------------------------------------------------------------

class AlertBase(BaseModel):
    """Base alert schema."""
    classroom_id: Optional[int] = None
    severity: str = "INFO"  # CRITICAL, WARNING, INFO, RESOLVED
    title: str
    message: str
    alert_type: str = "SYSTEM"


class AlertCreate(AlertBase):
    """Create alert schema."""
    pass


class AlertUpdate(BaseModel):
    """Update alert schema."""
    severity: Optional[str] = None
    acknowledged: Optional[bool] = None
    resolved: Optional[bool] = None


class AlertOut(AlertBase):
    """Alert response schema."""
    id: int
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# Energy Schemas
# -----------------------------------------------------------------------------

class MonthlyEnergyRecordBase(BaseModel):
    """Monthly campus energy record base."""
    month: int
    year: int
    grid_kwh: float
    generator_kwh: float
    solar_kwh: float
    total_kwh: float
    notes: Optional[str] = None
    data_source: str = "MRU Main Meter Substation"


class MonthlyEnergyRecordCreate(MonthlyEnergyRecordBase):
    """Create monthly energy record."""
    pass


class MonthlyEnergyRecordOut(MonthlyEnergyRecordBase):
    """Monthly energy record response."""
    id: int
    reconciled: bool = True
    discrepancy_kwh: float = 0.0
    model_config = ConfigDict(from_attributes=True)


class DailyEnergyReadingBase(BaseModel):
    """Daily energy reading base."""
    date: date
    classroom_id: Optional[int] = None
    source_type: str
    value_kwh: float


class DailyEnergyReadingCreate(DailyEnergyReadingBase):
    """Create daily energy reading."""
    pass


class DailyEnergyReadingOut(DailyEnergyReadingBase):
    """Daily energy reading response."""
    id: int
    model_config = ConfigDict(from_attributes=True)


class MonthOverMonthChange(BaseModel):
    """Month-over-month change metric."""
    month: int
    year: int
    period_label: str
    total_kwh: float
    change_kwh: Optional[float] = None
    change_percentage: Optional[float] = None


class EnergySummaryOut(BaseModel):
    """Aggregated campus energy consumption summary."""
    total_records: int
    annual_total_kwh: float
    annual_grid_kwh: float
    annual_generator_kwh: float
    annual_solar_kwh: float
    solar_share_percentage: float
    average_monthly_kwh: float
    peak_month: Dict[str, Any]
    lowest_month: Dict[str, Any]
    mom_changes: List[MonthOverMonthChange]


class EnergyValidationOut(BaseModel):
    """Data quality and reconciliation validation report."""
    total_records: int
    valid_records: int
    discrepancy_count: int
    is_valid: bool
    discrepancies: List[Dict[str, Any]]


# -----------------------------------------------------------------------------
# Savings Schemas
# -----------------------------------------------------------------------------

class SavingsEstimateRequest(BaseModel):
    """Input parameters for estimating potential energy savings."""
    classroom_ids: List[int]
    hours_avoided: float = 1.0
    days: int = 1
    tariff_per_kwh: Optional[float] = None
    load_kw: Optional[float] = None


class SavingsEstimateResponse(BaseModel):
    """Calculated estimated energy savings."""
    classroom_ids: List[int]
    classroom_count: int
    hours_avoided: float
    days: int
    load_kw: float
    tariff_per_kwh: float
    emission_factor_kg: float
    energy_saved_kwh: float
    cost_saved_inr: float
    co2_avoided_kg: float
    trees_equivalent: float


class SavingsCalculationRequest(BaseModel):
    """Save-enabled calculation request."""
    classroom_ids: List[int]
    hours_avoided: float
    days: int = 1
    calculation_type: str = "ESTIMATED"
    tariff_per_kwh: Optional[float] = None
    load_kw: Optional[float] = None


class SavingsRunOut(BaseModel):
    """Persisted savings calculation record."""
    id: int
    run_at: datetime
    classrooms_selected: str
    hours_avoided: float
    tariff_per_kwh: float
    load_kw: float
    energy_saved_kwh: float
    cost_saved: float
    co2_avoided_kg: float
    calculation_type: str
    model_config = ConfigDict(from_attributes=True)


class WhatIfScenario(BaseModel):
    """A projected what-if energy scenario."""
    scenario_name: str
    description: str
    num_classrooms: int
    hours_per_day: float
    days_per_year: int
    annual_kwh_saved: float
    annual_cost_saved_inr: float
    annual_co2_avoided_kg: float
    equivalent_trees_planted: float


class WhatIfResponse(BaseModel):
    """Response containing what-if analysis parameters and presets."""
    tariff_per_kwh: float
    emission_factor: float
    default_classroom_load_kw: float
    active_classroom_count: int
    scenarios: List[WhatIfScenario]


# -----------------------------------------------------------------------------
# Forecasting & ML Schemas
# -----------------------------------------------------------------------------

class ForecastRequest(BaseModel):
    """Request payload to run predictive forecasting model."""
    model_type: str = Field(default="linear", description="seasonal_naive, linear, or random_forest")
    periods: int = Field(default=3, ge=1, le=12, description="Forecast horizon in months")


class ForecastDataSufficiency(BaseModel):
    """Data sufficiency assessment for ML models."""
    sufficient: bool
    record_count: int
    min_required: int
    reason: str


class ForecastItem(BaseModel):
    """Single forecast projection point."""
    month: int
    year: int
    label: str
    predicted_total_kwh: float
    lower_bound_kwh: Optional[float] = None
    upper_bound_kwh: Optional[float] = None


class ForecastRunOut(BaseModel):
    """Forecast execution results."""
    id: int
    model_name: str
    training_period_start: str
    training_period_end: str
    forecast_period: str
    predicted_kwh: List[ForecastItem]
    rmse: Optional[float] = None
    mae: Optional[float] = None
    status: str
    run_at: datetime
    data_sufficient: bool = True
    model_config = ConfigDict(from_attributes=True)


class AnomalyItem(BaseModel):
    """Identified consumption anomaly record."""
    month: int
    year: int
    period_label: str
    actual_kwh: float
    mean_kwh: float
    std_kwh: float
    z_score: float
    is_anomaly: bool
    direction: str  # HIGH, LOW, NORMAL
    severity: str  # CRITICAL, WARNING, INFO
    reason: str


class AnomalyDetectionOut(BaseModel):
    """Full anomaly detection report."""
    method: str
    total_evaluated: int
    anomalies_detected: int
    anomalies: List[AnomalyItem]


class RecommendationItem(BaseModel):
    """Timetable-aware green recommendation item."""
    id: str
    category: str  # IDLE_LOAD, SOLAR_MATCHING, SCHEDULING, HEATWAVE_DEFENSE
    priority: str  # HIGH, MEDIUM, LOW
    title: str
    description: str
    potential_monthly_savings_kwh: float
    potential_monthly_savings_inr: float
    actionable_steps: List[str]


class RecommendationsOut(BaseModel):
    """Collection of actionable campus energy recommendations."""
    generated_at: datetime
    total_potential_savings_kwh: float
    total_potential_savings_inr: float
    recommendations: List[RecommendationItem]
