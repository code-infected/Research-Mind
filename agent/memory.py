"""
memory.py — High-level ChromaDB interface for the ResearchMind agent.

Provides a clean async interface over the memory_store tool,
with session management and research-specific convenience methods.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "mcp-server"))

from tools.memory_store import store, query, delete, get_stats, reset_collection
from tools.citation_tracker import clear_citations


async def save_finding(
    content: str,
    question: str,
    source_url: str = "",
    source_title: str = "",
    source_type: str = "web",
    session_id: str = "default",
) -> dict:
    """
    Save a research finding with standard metadata.

    Args:
        content: The finding text.
        question: The research sub-question this finding answers.
        source_url: URL of the source.
        source_title: Title of the source.
        source_type: Type of source ('web', 'arxiv', 'pdf').
        session_id: Session ID for scoping.

    Returns:
        Storage confirmation dict.
    """
    metadata = {
        "question": question,
        "source_url": source_url,
        "source_title": source_title,
        "source_type": source_type,
    }

    return await store(content=content, metadata=metadata, session_id=session_id)


async def retrieve_findings(
    query_text: str,
    max_results: int = 5,
    source_type: str = None,
    session_id: str = "default",
) -> list[dict]:
    """
    Retrieve relevant findings from memory.

    Args:
        query_text: Semantic search query.
        max_results: Maximum results to return.
        source_type: Optional filter by source type.
        session_id: Session ID for scoping.

    Returns:
        List of relevant findings.
    """
    filter_metadata = None
    if source_type:
        filter_metadata = {"source_type": source_type}

    return await query(query_text, max_results, filter_metadata, session_id=session_id)


async def get_memory_stats(session_id: str = "default") -> dict:
    """Get statistics about the current memory store."""
    return await get_stats(session_id=session_id)


def reset_session(session_id: str = "default"):
    """
    Reset memory and citations for a new research session.
    Call this before starting a new research topic.
    """
    reset_collection(session_id=session_id)
    clear_citations(session_id=session_id)
