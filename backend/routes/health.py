"""
health.py — Health check route for ResearchMind API.
"""

import os
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Health check endpoint.
    Returns service status and configuration info.
    """
    return {
        "status": "healthy",
        "service": "researchmind-api",
        "version": "0.1.0",
        "config": {
            "llm_provider": os.getenv("LLM_PROVIDER", "gemini"),
            "brave_api_configured": bool(os.getenv("BRAVE_API_KEY")),
            "google_api_configured": bool(os.getenv("GOOGLE_API_KEY")),
        },
    }
