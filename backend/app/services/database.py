"""
Database engine and session management - Teammate 2 (Backend/Platform).

Creates the SQLite database and provides a dependency-injectable session factory.
"""
from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from backend.app.models import Base

# Resolve the database path from env or default to ./network_anomaly.db
_DB_PATH = os.getenv("DATABASE_URL", str(Path(__file__).resolve().parents[3] / "network_anomaly.db"))

# Ensure file:// URLs are handled; plain paths become sqlite:///
if not _DB_PATH.startswith("sqlite"):
    _DB_PATH = f"sqlite:///{_DB_PATH}"

engine = create_engine(
    _DB_PATH,
    connect_args={"check_same_thread": False},
    echo=False,
)


# Enable WAL mode for concurrent readers
@event.listens_for(engine, "connect")
def _set_wal_mode(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables() -> None:
    """Create all tables (idempotent)."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency that yields a DB session and closes it after use."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
