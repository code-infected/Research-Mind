"""
health.py — Health check route for ResearchMind API.
"""

import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.database import get_db

router = APIRouter()


@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint.
    Returns service status and configuration info.
    """
    # Check database connectivity
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "unhealthy"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "researchmind-api",
        "version": "0.1.0",
        "database": db_status,
        "model": os.getenv("LLM_MODEL", ""),
        "provider": os.getenv("LLM_PROVIDER", ""),
    }
