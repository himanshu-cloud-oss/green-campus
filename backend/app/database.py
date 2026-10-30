"""Database session and engine setup."""
import os
import shutil
import tempfile
from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

BUNDLED_DB = Path(__file__).resolve().parent.parent / "greencampus.db"


def _resolve_database_url() -> str:
    """
    On Vercel the deployment filesystem is read-only, so the committed SQLite file is copied
    to the temp folder (/tmp) on cold start. Writes then work but are temporary: each new instance starts again
    from the committed data. Set DATABASE_URL to a hosted database for persistence.
    """
    url = settings.DATABASE_URL
    if os.environ.get("VERCEL") and url.startswith("sqlite"):
        target = Path(tempfile.gettempdir()) / "greencampus.db"  # /tmp on Vercel
        if not target.exists() and BUNDLED_DB.exists():
            shutil.copyfile(BUNDLED_DB, target)
        return f"sqlite:///{target}"
    return url


DATABASE_URL = _resolve_database_url()

# SQLite connection args for multithreaded FastAPI requests
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency that yields a database session and closes it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db(bind=None) -> None:
    """Create all database tables and add any new nullable columns to existing tables."""
    target = bind or engine
    Base.metadata.create_all(bind=target)
    _add_missing_columns(target)


def _add_missing_columns(target) -> None:
    """create_all() never alters existing tables, so add columns introduced after a DB was created."""
    from sqlalchemy import inspect, text

    inspector = inspect(target)
    with target.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if not inspector.has_table(table.name):
                continue
            existing = {c["name"] for c in inspector.get_columns(table.name)}
            for col in table.columns:
                if col.name not in existing and col.nullable:
                    col_type = col.type.compile(dialect=target.dialect)
                    conn.execute(text(f'ALTER TABLE {table.name} ADD COLUMN {col.name} {col_type}'))
