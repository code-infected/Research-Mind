"""
history.py — Research history routes for ResearchMind API.

GET /history — List past research sessions (optionally filtered by user)
GET /report/{id} — Get a specific research report
"""

import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import ResearchSession, Report
from backend.auth import get_current_user_id

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/history")
async def list_sessions(
    request: Request,
    limit: int = Query(20, ge=1, le=100, description="Number of sessions to return (1-100)"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
):
    """
    List past research sessions, most recent first.
    If authenticated, shows only the user's sessions.
    If unauthenticated, shows all sessions.
    """
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)

    # Get user ID for filtering (if authenticated)
    user_id = await get_current_user_id(request)

    try:
        # Run DB query with 2 second timeout to fail fast
        def _query_db():
            query = db.query(ResearchSession)
            # Filter by user if authenticated
            if user_id:
                query = query.filter(ResearchSession.user_id == user_id)
            return query.order_by(ResearchSession.created_at.desc()).offset(offset).limit(limit).all()

        sessions = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(None, _query_db),
            timeout=2.0
        )

        # Separate count query with timeout
        def _count_db():
            query = db.query(ResearchSession)
            if user_id:
                query = query.filter(ResearchSession.user_id == user_id)
            return query.count()

        total = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(None, _count_db),
            timeout=2.0
        )

        return {
            "sessions": [s.to_summary() for s in sessions],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except asyncio.TimeoutError:
        logger.warning("History query timed out (database unavailable)")
        return {
            "sessions": [],
            "total": 0,
            "limit": limit,
            "offset": offset,
            "error": "Database timeout - using offline mode",
        }
    except Exception as e:
        logger.warning(f"History query failed (database unavailable): {e}")
        return {
            "sessions": [],
            "total": 0,
            "limit": limit,
            "offset": offset,
            "error": "Database unavailable",
        }


@router.get("/report/{session_id}")
async def get_report(
    session_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Get a specific research session and its report by session ID.
    Only allows access to the user's own sessions or unauthenticated public sessions.
    """
    session = db.query(ResearchSession).filter_by(id=session_id).first()

    if not session:
        raise HTTPException(status_code=404, detail="Research session not found")

    # Check if user owns this session
    user_id = await get_current_user_id(request)
    if session.user_id is not None and user_id != session.user_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view this report"
        )

    return session.to_dict()
