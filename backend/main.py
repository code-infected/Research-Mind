"""
main.py — FastAPI application entry point for ResearchMind.

Usage:
    uvicorn backend.main:app --reload --port 8000
"""

import sys
import os
import logging
import signal
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
from pathlib import Path

from backend.limiter import limiter

load_dotenv(Path(__file__).parent.parent / ".env")

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","name":"%(name)s","message":"%(message)s"}',
)
logger = logging.getLogger("researchmind")

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, "mcp-server"))

from backend.database import init_db
from backend.routes import research, history, health

# Rate limiter is imported from backend.limiter


def validate_environment() -> list[str]:
    """Validate required environment variables at startup."""
    errors = []
    required = ["LLM_PROVIDER"]
    for var in required:
        if not os.getenv(var):
            errors.append(f"Missing required env var: {var}")
    return errors


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan — initialize DB on startup and cleanup on shutdown."""
    logger.info("Starting ResearchMind API")

    # Validate environment
    env_errors = validate_environment()
    if env_errors:
        for err in env_errors:
            logger.warning(f"Environment validation: {err}")

    # Initialize database (non-blocking - app works in offline mode if DB fails)
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        logger.warning("Running in offline mode - research history will not be saved")

    # Graceful shutdown handler
    def shutdown_handler(signum, frame):
        logger.info("Received shutdown signal, cleaning up...")
        # Note: Actual cleanup would go here (close DB connections, etc.)

    try:
        signal.signal(signal.SIGTERM, shutdown_handler)
    except (OSError, ValueError):
        pass  # SIGTERM not available on Windows
    signal.signal(signal.SIGINT, shutdown_handler)

    yield

    logger.info("Shutting down ResearchMind API")


app = FastAPI(
    title="ResearchMind API",
    description=(
        "Autonomous AI research agent API. "
        "Streams real-time research progress via SSE and produces "
        "structured reports with citations."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow Next.js frontend (local + deployed)
# Support multiple deployment platforms
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

# Add deployment-specific origins from environment
additional_origins = os.getenv("CORS_ORIGINS", "")
if additional_origins:
    allowed_origins.extend([o.strip() for o in additional_origins.split(",") if o.strip()])

# Production CORS - explicit origins only
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
    max_age=600,
)

# Request ID middleware for observability
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add request ID to all requests for tracing."""
    import uuid
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
    request.state.request_id = request_id

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# Register routes
app.include_router(research.router, prefix="/api", tags=["Research"])
app.include_router(history.router, prefix="/api", tags=["History"])
app.include_router(health.router, prefix="/api", tags=["Health"])


@app.get("/")
async def root():
    """Root endpoint — API info."""
    return {
        "name": "ResearchMind API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/api/health",
    }
