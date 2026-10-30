"""Main FastAPI application entry point for Green Campus AI (Manav Rachna University)."""
from datetime import datetime, timezone
import os
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.database import init_db, get_db
from app.schemas.schemas import HealthResponse
from scripts.seed_data import seed_database_if_empty
from app.services.telemetry_service import warm_cache

# Import all API routers
from app.api import (
    classrooms_router,
    timetable_router,
    energy_router,
    bookings_router,
    simulations_router,
    alerts_router,
    savings_router,
    forecast_router,
    audit_router,
    inventory_router,
    telemetry_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context: initialize database tables and seed sample data."""
    # Initialize database schema
    init_db()
    # Idempotently seed default data
    seed_database_if_empty()
    # Pre-compute last month of simulated telemetry in the background
    # (skipped on serverless hosts, where instances are short-lived)
    if not os.environ.get("VERCEL"):
        threading.Thread(target=warm_cache, daemon=True).start()
    yield


# Initialize FastAPI Application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Intelligent Energy Conservation and Classroom Orchestration Backend for Manav Rachna University.",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS)
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers under /api
app.include_router(classrooms_router, prefix="/api")
app.include_router(timetable_router, prefix="/api")
app.include_router(energy_router, prefix="/api")
app.include_router(bookings_router, prefix="/api")
app.include_router(simulations_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(savings_router, prefix="/api")
app.include_router(forecast_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(inventory_router, prefix="/api")
app.include_router(telemetry_router, prefix="/api")


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """System health check endpoint verifying database connectivity and operational status."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return HealthResponse(
        status="ok" if db_status == "connected" else "degraded",
        timestamp=datetime.now(timezone.utc),
        db_status=db_status,
        demo_mode=settings.DEMO_MODE,
        version=settings.APP_VERSION,
    )


@app.get("/", tags=["Root"])
def root():
    """Root endpoint redirecting or confirming Green Campus AI service status."""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs_url": "/docs",
        "api_health": "/api/health",
    }
