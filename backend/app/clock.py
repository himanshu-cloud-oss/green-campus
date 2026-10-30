"""Campus wall-clock time.

The timetable, simulator and bookings all reason in Indian Standard Time. Servers
(Vercel, most clouds) run in UTC, so never use the server's local clock directly.
"""
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.config import settings

CAMPUS_TZ = ZoneInfo(settings.APP_TIMEZONE)


def now_local() -> datetime:
    """Current campus time as a naive datetime (the convention used across the app)."""
    return datetime.now(CAMPUS_TZ).replace(tzinfo=None)


def today_local() -> date:
    return now_local().date()


def utc_offset() -> timedelta:
    """Campus offset from UTC (for converting stored naive-UTC timestamps)."""
    return datetime.now(CAMPUS_TZ).utcoffset() or timedelta(0)
