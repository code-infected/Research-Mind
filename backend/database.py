"""
database.py — Database connection and session management for ResearchMind.

Uses SQLAlchemy with Supabase PostgreSQL in production.
Falls back to SQLite for local development if DATABASE_URL is not set.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./researchmind.db")

# Handle Supabase connection strings (they use postgres:// but SQLAlchemy needs postgresql://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
engine_args = {"pool_pre_ping": True}

if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_args)
else:
    # Production PostgreSQL - add connection pooling with SSL for Supabase
    engine = create_engine(
        DATABASE_URL,
        pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "5")),
        pool_recycle=3600,
        pool_timeout=5,
        connect_args={
            "connect_timeout": 5,
            "sslmode": "require",  # Required for Supabase
        },
        **engine_args
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all database tables."""
    from . import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
