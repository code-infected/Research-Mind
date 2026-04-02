"""
stream.py — Server-Sent Events (SSE) helpers for ResearchMind.

Formats agent events into SSE format for real-time streaming
from FastAPI to the Next.js frontend.
"""

import json
from typing import AsyncGenerator


def format_sse(event_type: str, data: dict) -> str:
    """
    Format a dict as an SSE event string.

    Args:
        event_type: The SSE event type (e.g., 'tool_start', 'finding').
        data: The event data dict.

    Returns:
        A properly formatted SSE string.
    """
    json_data = json.dumps(data)
    return f"event: {event_type}\ndata: {json_data}\n\n"


def format_sse_error(error: str) -> str:
    """Format an error as an SSE event."""
    return format_sse("error", {"error": error})


def format_sse_done(metadata: dict = None) -> str:
    """Format the final 'done' SSE event."""
    return format_sse("done", metadata or {})
