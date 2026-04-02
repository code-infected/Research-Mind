"""
pdf_reader.py — PDF extraction and chunking for ResearchMind MCP Server.

Fetches a PDF from a URL (or reads from disk) and extracts clean text.
Supports chunking for large documents that would exceed LLM context limits.
Uses PyMuPDF (fitz) for fast, reliable extraction.
"""

import io
import httpx
import fitz  # PyMuPDF
from typing import Optional


async def read_pdf(
    source: str,
    max_pages: int = 20,
    chunk_size: int = 4000,
    start_page: int = 0,
) -> dict:
    """
    Extract text from a PDF file (URL or local path).

    Args:
        source: URL to a PDF file, or a local file path.
        max_pages: Maximum number of pages to extract (default 20).
        start_page: Page to start extraction from (0-indexed, default 0).
        chunk_size: Maximum characters per chunk when splitting (default 4000).

    Returns:
        A dict with keys:
        - source: The original source path/URL
        - total_pages: Total pages in the document
        - pages_extracted: Number of pages actually extracted
        - chunks: list of text chunks, each ≤ chunk_size characters
        - metadata: dict with title, author, subject if available
    """
    # Fetch PDF bytes
    if source.startswith(("http://", "https://")):
        pdf_bytes = await _fetch_pdf(source)
    else:
        with open(source, "rb") as f:
            pdf_bytes = f.read()

    # Open with PyMuPDF
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    total_pages = len(doc)
    end_page = min(start_page + max_pages, total_pages)

    # Extract metadata
    metadata = {}
    meta = doc.metadata
    if meta:
        for key in ("title", "author", "subject", "keywords"):
            if meta.get(key):
                metadata[key] = meta[key]

    # Extract text page by page
    full_text = ""
    pages_extracted = 0

    for page_num in range(start_page, end_page):
        page = doc[page_num]
        text = page.get_text("text")
        if text.strip():
            full_text += f"\n--- Page {page_num + 1} ---\n{text}"
            pages_extracted += 1

    doc.close()

    # Chunk the text
    chunks = _chunk_text(full_text.strip(), chunk_size)

    return {
        "source": source,
        "total_pages": total_pages,
        "pages_extracted": pages_extracted,
        "chunks": chunks,
        "metadata": metadata,
    }


async def _fetch_pdf(url: str) -> bytes:
    """Download a PDF from a URL."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
    }

    async with httpx.AsyncClient(
        timeout=30.0,
        follow_redirects=True,
        max_redirects=5,
    ) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()

        content_type = response.headers.get("content-type", "")
        if "pdf" not in content_type and not url.lower().endswith(".pdf"):
            raise ValueError(
                f"URL does not appear to be a PDF. Content-Type: {content_type}"
            )

        return response.content


def _chunk_text(text: str, chunk_size: int) -> list[str]:
    """Split text into chunks, trying to break at paragraph boundaries."""
    if len(text) <= chunk_size:
        return [text] if text else []

    chunks = []
    remaining = text

    while remaining:
        if len(remaining) <= chunk_size:
            chunks.append(remaining)
            break

        # Try to find a paragraph break near the chunk boundary
        split_pos = remaining.rfind("\n\n", 0, chunk_size)
        if split_pos == -1 or split_pos < chunk_size // 2:
            # No good paragraph break — try a single newline
            split_pos = remaining.rfind("\n", 0, chunk_size)
        if split_pos == -1 or split_pos < chunk_size // 2:
            # No good break at all — hard cut at chunk_size
            split_pos = chunk_size

        chunks.append(remaining[:split_pos].strip())
        remaining = remaining[split_pos:].strip()

    return chunks
