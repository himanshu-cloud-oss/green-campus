"""SQLAlchemy database models for Green Campus AI."""
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Date,
    Time,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from app.database import Base


class Classroom(Base):
    """Classroom model representing physical lecture spaces in campus."""

    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    building = Column(String(100), default="Engineering Block", nullable=False)
    floor = Column(Integer, default=1, nullable=False)
    capacity = Column(Integer, default=60, nullable=False)
    connected_load_kw = Column(Float, default=2.4, nullable=False)

    # Relationships
    timetable_entries = relationship("TimetableEntry", back_populates="classroom", cascade="all, delete-orphan")
    device_state = relationship("DeviceState", back_populates="classroom", uselist=False, cascade="all, delete-orphan")
    bookings = relationship("ExtraClassBooking", back_populates="classroom", cascade="all, delete-orphan")
    simulation_events = relationship("SimulationEvent", back_populates="classroom", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="classroom")
    daily_readings = relationship("DailyEnergyReading", back_populates="classroom")


class TimetableEntry(Base):
    """Scheduled academic periods for classrooms across weekdays."""

    __tablename__ = "timetable_entries"

    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False, index=True)
    day_of_week = Column(String(10), nullable=False, index=True)  # MON, TUE, WED, THU, FRI
    period_number = Column(String(10), nullable=False)  # 1-10, LUNCH
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    subject = Column(String(150), nullable=False)
    teacher = Column(String(100), nullable=False)
    section = Column(String(50), nullable=False)
    demo_data = Column(Boolean, default=True, nullable=False)

    # Relationships
    classroom = relationship("Classroom", back_populates="timetable_entries")


class MonthlyEnergyRecord(Base):
    """Historical monthly campus-wide energy consumption data."""

    __tablename__ = "monthly_energy_records"

    id = Column(Integer, primary_key=True, index=True)
    month = Column(Integer, nullable=False)  # 1 to 12
    year = Column(Integer, nullable=False)   # e.g. 2024, 2025
    grid_kwh = Column(Float, nullable=False)
    generator_kwh = Column(Float, nullable=False)
    solar_kwh = Column(Float, nullable=False)
    total_kwh = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    data_source = Column(String(150), default="MRU Main Meter Substation", nullable=False)


class DailyEnergyReading(Base):
    """Daily energy consumption readings for campus or specific classrooms."""

    __tablename__ = "daily_energy_readings"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True, index=True)  # NULL = Campus level
    source_type = Column(String(20), nullable=False)  # GRID, GENERATOR, SOLAR
    value_kwh = Column(Float, nullable=False)

    # Relationships
    classroom = relationship("Classroom", back_populates="daily_readings")


class ExtraClassBooking(Base):
    """Ad-hoc and extra class bookings for classrooms."""

    __tablename__ = "extra_class_bookings"

    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    subject = Column(String(150), nullable=False)
    expected_students = Column(Integer, default=30, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, CANCELLED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    classroom = relationship("Classroom", back_populates="bookings")


class DeviceState(Base):
    """Real-time active state of classroom electrical loads (AC, fans, lights)."""

    __tablename__ = "device_states"

    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), unique=True, nullable=False)
    ac_on = Column(Boolean, default=False, nullable=False)
    fan_on = Column(Boolean, default=False, nullable=False)
    lights_on = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    source = Column(String(30), default="TIMETABLE", nullable=False)  # TIMETABLE, OVERRIDE, SIMULATION

    # Relationships
    classroom = relationship("Classroom", back_populates="device_state")


class SimulationEvent(Base):
    """No-show simulations and automated shutdown events."""

    __tablename__ = "simulation_events"

    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False, index=True)
    event_type = Column(String(50), default="NO_SHOW", nullable=False)  # NO_SHOW, OVERRIDE, AUTO_OFF
    triggered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    scheduled_action_at = Column(DateTime, nullable=False)
    status = Column(String(20), default="PENDING", nullable=False)  # PENDING, EXECUTED, CANCELLED
    period_label = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    classroom = relationship("Classroom", back_populates="simulation_events")


class Alert(Base):
    """Energy anomalies, scheduling warnings, and system notifications."""

    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True, index=True)
    severity = Column(String(20), default="INFO", nullable=False)  # CRITICAL, WARNING, INFO, RESOLVED
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    alert_type = Column(String(50), default="SYSTEM", nullable=False)  # ENERGY_SPIKE, NO_SHOW_DETECTED, etc.

    # Relationships
    classroom = relationship("Classroom", back_populates="alerts")


class SavingsRun(Base):
    """Historical records of energy and cost savings calculations."""

    __tablename__ = "savings_runs"

    id = Column(Integer, primary_key=True, index=True)
    run_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    classrooms_selected = Column(String(255), nullable=False)
    hours_avoided = Column(Float, nullable=False)
    tariff_per_kwh = Column(Float, nullable=False)
    load_kw = Column(Float, nullable=False)
    energy_saved_kwh = Column(Float, nullable=False)
    cost_saved = Column(Float, nullable=False)
    co2_avoided_kg = Column(Float, nullable=False)
    calculation_type = Column(String(30), default="ESTIMATED", nullable=False)  # ESTIMATED, WHATIF


class ForecastRun(Base):
    """Trained model runs and generated forecast records."""

    __tablename__ = "forecast_runs"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(50), nullable=False)
    training_period_start = Column(String(20), nullable=False)
    training_period_end = Column(String(20), nullable=False)
    forecast_period = Column(String(100), nullable=False)
    predicted_kwh = Column(Text, nullable=False)  # JSON string
    rmse = Column(Float, nullable=True)
    mae = Column(Float, nullable=True)
    status = Column(String(20), default="SUCCESS", nullable=False)
    run_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class AuditLog(Base):
    """Audit trail of administrative and automated system actions."""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False, index=True)  # BOOKING, SIMULATION, SETTING, etc.
    entity_id = Column(String(50), nullable=True)
    action = Column(String(50), nullable=False)  # CREATE, UPDATE, CANCEL, EXECUTE, DELETE
    actor = Column(String(100), default="system", nullable=False)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class Setting(Base):
    """Dynamic system parameters and operational configuration."""

    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
