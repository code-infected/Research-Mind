"""
models.py — SQLAlchemy models for ResearchMind.

Three tables matching the handoff spec:
- User (from Clerk)
- Session (research sessions)
- Report (generated reports)
"""

from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    """User record synced from Clerk authentication."""

    __tablename__ = "users"

    id = Column(String(64), primary_key=True)  # Clerk user ID
    email = Column(String(255), nullable=True, index=True)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    sessions = relationship("ResearchSession", back_populates="user", lazy="dynamic")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ResearchSession(Base):
    """A single research session — one topic, one user."""

    __tablename__ = "research_sessions"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=True, index=True)
    topic = Column(String(500), nullable=False, index=True)
    status = Column(
        String(20),
        nullable=False,
        default="pending",  # pending, running, completed, failed
    )
    sub_questions = Column(JSON, default=list)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="sessions")
    report = relationship("Report", back_populates="session", uselist=False)

    def _duration_seconds(self) -> int | None:
        """Calculate duration of research session in seconds."""
        if self.completed_at and self.created_at:
            return int((self.completed_at - self.created_at).total_seconds())
        return None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "topic": self.topic,
            "status": self.status,
            "sub_questions": self.sub_questions or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_seconds": self._duration_seconds(),
            "report": self.report.to_dict() if self.report else None,
        }

    def to_summary(self) -> dict:
        return {
            "id": self.id,
            "topic": self.topic,
            "status": self.status,
            "sources_cited": getattr(self.report, "sources_cited", 0) if self.report else 0,
            "word_count": getattr(self.report, "word_count", 0) if self.report else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_seconds": self._duration_seconds(),
        }


class Report(Base):
    """Generated research report linked to a session."""

    __tablename__ = "reports"

    id = Column(String(36), primary_key=True)
    session_id = Column(
        String(36), ForeignKey("research_sessions.id"), nullable=False, unique=True
    )
    content = Column(Text, default="")  # Full markdown report
    bibliography = Column(Text, default="")
    sources = Column(JSON, default=list)  # Source metadata as JSON

    # Stats
    sources_cited = Column(Integer, default=0)
    findings_count = Column(Integer, default=0)
    word_count = Column(Integer, default=0)

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    session = relationship("ResearchSession", back_populates="report")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "content": self.content,
            "bibliography": self.bibliography,
            "sources": self.sources or [],
            "sources_cited": self.sources_cited,
            "findings_count": self.findings_count,
            "word_count": self.word_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
