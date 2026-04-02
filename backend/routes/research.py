"""
research.py — Research route for ResearchMind API.

POST /research — Starts a new research session and streams agent events
via Server-Sent Events (SSE).
"""

import sys
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "mcp-server"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.database import get_db
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


@router.post("/research")
async def start_research(
    request_body: ResearchRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Start a new research session. Returns an SSE stream of agent events.

    Events: plan → tool_start → tool_result → finding → report → done
    """
    session_id = str(uuid.uuid4())
    report_id = str(uuid.uuid4())

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

    async def event_stream():
        try:
            reset_session()

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

            session.sub_questions = questions
            db.commit()

            # Step 2: Execute research
            async for event in execute_research(questions, config):
                yield format_sse(event.type, event.to_dict())

            # Step 3: Synthesize report
            yield format_sse("status", {"message": "Synthesizing research report..."})

            result = await synthesize_report(
                topic=request_body.topic,
                questions=questions,
                config=config,
            )

            yield format_sse("report", {
                "report": result["report"],
                "metadata": result["metadata"],
            })

            # Save report to DB
            report = Report(
                id=report_id,
                session_id=session_id,
                content=result["report"],
                bibliography=result["bibliography"],
                sources_cited=result["metadata"]["sources_cited"],
                findings_count=result["metadata"]["findings_used"],
                word_count=result["metadata"]["word_count"],
            )
            db.add(report)

            session.status = "completed"
            session.completed_at = datetime.now(timezone.utc)
            db.commit()

            yield format_sse_done(result["metadata"])

        except Exception as e:
            session.status = "failed"
            db.commit()
            yield format_sse_error(str(e))

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
