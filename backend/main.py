"""
main.py — FastAPI application entry point for ResearchMind.

Usage:
    uvicorn backend.main:app --reload --port 8000
"""

import sys
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, "mcp-server"))

from backend.database import init_db
from backend.routes import research, history, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — initialize DB on startup."""
    init_db()
    yield


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

# CORS — allow Next.js frontend (local + deployed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
