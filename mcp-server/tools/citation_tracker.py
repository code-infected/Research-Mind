"""
citation_tracker.py — Source formatting and deduplication for ResearchMind MCP Server.

Tracks all sources discovered during a research session and produces
formatted citations. Handles deduplication by URL, supports multiple
citation formats, and generates a bibliography section.
"""

import hashlib
from datetime import datetime, timezone
from typing import Optional


# Session-scoped in-memory citation store
_citations: dict[str, dict[str, dict]] = {}


async def add_citation(
    url: str,
    title: str,
    excerpt: str = "",
    authors: Optional[list[str]] = None,
    published_date: Optional[str] = None,
    source_type: str = "web",
    session_id: str = "default",
) -> dict:
    """
    Add a source citation. Automatically deduplicates by URL.

    Args:
        url: The source URL (used as the unique key).
        title: Title of the source.
        excerpt: A relevant excerpt or snippet from the source.
        authors: Optional list of author names.
        published_date: Optional publication date string.
        source_type: Type of source — 'web', 'paper', 'pdf', 'arxiv'.

    Returns:
        A dict with keys: id, is_new (bool), citation_number, formatted.
    """
    # Generate a stable ID from the URL
    url_hash = hashlib.md5(url.encode()).hexdigest()[:12]

    session_store = _citations.setdefault(session_id, {})
    is_new = url_hash not in session_store

    if is_new:
        citation_number = len(session_store) + 1
        session_store[url_hash] = {
            "id": url_hash,
            "number": citation_number,
            "url": url,
            "title": title,
            "excerpt": excerpt,
            "authors": authors or [],
            "published_date": published_date or "",
            "source_type": source_type,
            "added_at": datetime.now(timezone.utc).isoformat(),
        }
    else:
        citation_number = session_store[url_hash]["number"]
        # Update excerpt if a new one is provided
        if excerpt and not session_store[url_hash]["excerpt"]:
            session_store[url_hash]["excerpt"] = excerpt

    citation = session_store[url_hash]
    formatted = _format_citation(citation)

    return {
        "id": url_hash,
        "is_new": is_new,
        "citation_number": citation_number,
        "formatted": formatted,
    }


async def get_all_citations(session_id: str = "default") -> list[dict]:
    """
    Get all tracked citations for a session, sorted by citation number.

    Args:
        session_id: The research session identifier.

    Returns:
        A list of all citation dicts, ordered by number.
    """
    session_store = _citations.get(session_id, {})
    return sorted(session_store.values(), key=lambda c: c["number"])


async def get_bibliography(format: str = "markdown", session_id: str = "default") -> str:
    """
    Generate a formatted bibliography of all tracked sources.

    Args:
        format: Output format — 'markdown' (default) or 'plain'.
        session_id: The research session identifier.

    Returns:
        A formatted string containing all citations as a bibliography.
    """
    session_store = _citations.get(session_id, {})
    citations = sorted(session_store.values(), key=lambda c: c["number"])

    if not citations:
        return "No sources cited."

    if format == "markdown":
        return _bibliography_markdown(citations)
    else:
        return _bibliography_plain(citations)


async def get_citation_count(session_id: str = "default") -> int:
    """Get the number of unique citations tracked for a session."""
    return len(_citations.get(session_id, {}))


def clear_citations(session_id: str = "default"):
    """Clear citations for a specific session (for starting a new research session)."""
    if session_id in _citations:
        _citations[session_id].clear()


def _format_citation(citation: dict) -> str:
    """Format a single citation as a markdown reference."""
    num = citation["number"]
    title = citation["title"]
    url = citation["url"]
    authors = citation["authors"]
    date = citation["published_date"]
    source_type = citation["source_type"]

    parts = [f"[{num}]"]

    if authors:
        author_str = ", ".join(authors[:3])
        if len(authors) > 3:
            author_str += " et al."
        parts.append(author_str + ".")

    parts.append(f'"{title}."')

    if date:
        parts.append(f"({date}).")

    type_label = {
        "web": "Web",
        "paper": "arXiv Paper",
        "pdf": "PDF Document",
        "arxiv": "arXiv Paper",
    }.get(source_type, "Source")

    parts.append(f"*{type_label}*.")
    parts.append(f"[Link]({url})")

    return " ".join(parts)


def _bibliography_markdown(citations: list[dict]) -> str:
    """Generate a markdown bibliography."""
    lines = ["## Sources\n"]

    for citation in citations:
        formatted = _format_citation(citation)
        lines.append(formatted)
        if citation.get("excerpt"):
            lines.append(f"  > {citation['excerpt'][:200]}")
        lines.append("")

    return "\n".join(lines)


def _bibliography_plain(citations: list[dict]) -> str:
    """Generate a plain text bibliography."""
    lines = ["SOURCES", "=" * 40, ""]

    for citation in citations:
        num = citation["number"]
        title = citation["title"]
        url = citation["url"]
        authors = ", ".join(citation["authors"]) if citation["authors"] else "Unknown"
        date = citation["published_date"] or "n.d."

        lines.append(f"[{num}] {authors}. \"{title}.\" ({date})")
        lines.append(f"    URL: {url}")
        lines.append("")

    return "\n".join(lines)
