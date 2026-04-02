"""
history.py — Research history routes for ResearchMind API.

GET /history — List past research sessions (optionally filtered by user)
GET /report/{id} — Get a specific research report
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import ResearchSession, Report
from backend.auth import get_current_user_id

router = APIRouter()


@router.get("/history")
async def list_sessions(
    request: Request,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """
    List past research sessions, most recent first.
    If authenticated, shows only the user's sessions.
    If unauthenticated, shows all sessions.
    """
    limit = min(limit, 100)

    query = db.query(ResearchSession)

    # Filter by user if authenticated
    user_id = await get_current_user_id(request)
    if user_id:
        query = query.filter(ResearchSession.user_id == user_id)

    sessions = (
        query
        .order_by(ResearchSession.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    total = query.count()

    return {
        "sessions": [s.to_summary() for s in sessions],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/report/{session_id}")
async def get_report(session_id: str, db: Session = Depends(get_db)):
    """
    Get a specific research session and its report by session ID.
    """
    session = db.query(ResearchSession).filter_by(id=session_id).first()

    if not session:
        raise HTTPException(status_code=404, detail="Research session not found")

    return session.to_dict()
