"""
research.py — Research route for ResearchMind API.

POST /research — Starts a new research session and streams agent events
via Server-Sent Events (SSE).
"""

import sys
import os
import uuid
import re
import logging
from datetime import datetime, timezone
import time

from fastapi import APIRouter, Depends, Request

logger = logging.getLogger("researchmind")
from fastapi.responses import StreamingResponse
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from backend.limiter import limiter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "mcp-server"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.database import get_db, SessionLocal
from backend.models import ResearchSession, Report, User
from backend.stream import format_sse, format_sse_error, format_sse_done
from backend.auth import get_current_user_id, get_or_create_user
from agent.planner import decompose_topic
from agent.executor import execute_research
from agent.synthesizer import synthesize_report
from agent.config import AgentConfig
from agent.memory import reset_session

router = APIRouter()


class ResearchRequest(BaseModel):
    """Request body for starting a new research session."""
    topic: str = Field(..., min_length=3, max_length=500, description="The research topic")
    context: str = Field("", max_length=1000, description="Optional context or constraints")
    max_sub_questions: int = Field(5, ge=2, le=8, description="Number of sub-questions")
    include_arxiv: bool = Field(True, description="Include arXiv paper search")

    @field_validator('topic', mode='before')
    @classmethod
    def sanitize_topic(cls, v: str) -> str:
        """Sanitize research topic to prevent injection attacks while preserving valid research characters."""
        v = v.strip()
        # Remove null bytes and control characters
        v = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', v)
        # Remove common prompt-injection keywords (case-insensitive)
        v = re.sub(r'(?i)(ignore previous instructions|system prompt|you are now|act as a|new role:|override)', '', v)
        # Allow alphanumeric, spaces, and common research punctuation (including +, #, &, *, /, $, %, =, @, ~)
        v = re.sub(r'[^\w\s\-\.,;:!?()\[\]"\'\u00C0-\u024F+#&*/$%=@~|<>{}^]', '', v)
        return v[:500]  # Enforce max length


@router.post("/research")
@limiter.limit("10/minute")
async def start_research(
    request_body: ResearchRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Start a new research session. Returns an SSE stream of agent events.

    Events: plan → tool_start → tool_result → finding → report → done
    """
    # Rate limiting: 10 requests per minute per IP (applied via @limiter.limit decorator)

    session_id = str(uuid.uuid4())
    report_id = str(uuid.uuid4())
    start_time = time.monotonic()

    # Get authenticated user (optional — works without auth too)
    user_id = await get_current_user_id(request)
    if user_id:
        await get_or_create_user(user_id, db)

    # Create DB session record
    session = ResearchSession(
        id=session_id,
        user_id=user_id,
        topic=request_body.topic,
        status="running",
    )
    db.add(session)
    db.commit()

    config = AgentConfig.from_env()
    config.max_sub_questions = request_body.max_sub_questions
    config.include_arxiv = request_body.include_arxiv

    # Close initial DB session - we'll use fresh sessions per operation in the generator
    db.close()

    async def event_stream():
        # Use session-per-operation to avoid holding connections during long research
        local_db = SessionLocal()
        try:
            reset_session(session_id=session_id)

            # Step 1: Plan
            yield format_sse("status", {"message": "Decomposing research topic..."})

            questions = await decompose_topic(
                topic=request_body.topic,
                config=config,
                context=request_body.context,
            )

            yield format_sse("plan", {
                "session_id": session_id,
                "topic": request_body.topic,
                "sub_questions": questions,
            })

            # Update session with questions - short transaction
            try:
                session = local_db.query(ResearchSession).filter_by(id=session_id).first()
                if session:
                    session.sub_questions = questions
                    local_db.commit()
            except Exception as e:
                local_db.rollback()
                logger.warning(f"Failed to update session questions: {e}")

            # Step 2: Execute research (this can take minutes)
            async for event in execute_research(questions, config, session_id=session_id):
                yield format_sse(event.type, event.to_dict())

            # Step 3: Synthesize report
            yield format_sse("status", {"message": "Synthesizing research report..."})

            result = await synthesize_report(
                topic=request_body.topic,
                questions=questions,
                config=config,
                session_id=session_id,
            )

            duration_seconds = int(time.monotonic() - start_time)
            duration_label = f"{duration_seconds // 60}M {duration_seconds % 60}S"

            metadata = dict(result["metadata"]) if result.get("metadata") else {}
            metadata.update({
                "duration": duration_label,
                "duration_seconds": duration_seconds,
                "model": os.getenv("LLM_MODEL") or os.getenv("LLM_PROVIDER", ""),
                "bibliography": result.get("bibliography_structured", []),
            })

            yield format_sse("report", {
                "report": result["report"],
                "metadata": metadata,
            })

            # Save report to DB - short transaction
            try:
                report = Report(
                    id=report_id,
                    session_id=session_id,
                    content=result["report"],
                    bibliography=result["bibliography"],
                    sources_cited=result["metadata"]["sources_cited"],
                    findings_count=result["metadata"]["findings_used"],
                    word_count=result["metadata"]["word_count"],
                )
                local_db.add(report)

                session = local_db.query(ResearchSession).filter_by(id=session_id).first()
                if session:
                    session.status = "completed"
                    session.completed_at = datetime.now(timezone.utc)
                local_db.commit()

                yield format_sse_done(result["metadata"])
            except Exception as e:
                local_db.rollback()
                logger.error(f"Failed to save report: {e}")
                yield format_sse_error(f"Failed to save report: {e}")

        except Exception as e:
            # Try to mark session as failed using existing connection first
            try:
                if local_db:
                    local_db.rollback()
                    session = local_db.query(ResearchSession).filter_by(id=session_id).first()
                    if session:
                        session.status = "failed"
                        session.completed_at = datetime.now(timezone.utc)
                        local_db.commit()
            except Exception:
                # Fallback to a fresh connection if local_db is broken
                try:
                    fail_db = SessionLocal()
                    session = fail_db.query(ResearchSession).filter_by(id=session_id).first()
                    if session:
                        session.status = "failed"
                        session.completed_at = datetime.now(timezone.utc)
                        fail_db.commit()
                    fail_db.close()
                except Exception:
                    pass
            yield format_sse_error(str(e))
        finally:
            local_db.close()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
