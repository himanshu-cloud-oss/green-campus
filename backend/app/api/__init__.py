"""API routers package for Green Campus AI."""
from app.api.classrooms import router as classrooms_router
from app.api.timetable import router as timetable_router
from app.api.energy import router as energy_router
from app.api.bookings import router as bookings_router
from app.api.simulations import router as simulations_router
from app.api.alerts import router as alerts_router
from app.api.savings import router as savings_router
from app.api.forecast import router as forecast_router
from app.api.audit import router as audit_router
from app.api.inventory import router as inventory_router
from app.api.telemetry import router as telemetry_router

__all__ = [
    "classrooms_router",
    "timetable_router",
    "energy_router",
    "bookings_router",
    "simulations_router",
    "alerts_router",
    "savings_router",
    "forecast_router",
    "audit_router",
    "inventory_router",
    "telemetry_router",
]
