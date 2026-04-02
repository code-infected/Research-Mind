"""
server.py — FastMCP server entry point for ResearchMind.

Registers all 7 research tools as MCP tools that any agent or client
can call. This is the open-source part — any developer can plug this
server into their own agent.

Usage:
    # Run the server
    fastmcp run server.py

    # Test with the MCP Inspector
    fastmcp dev server.py
"""

import os
import json
from typing import Optional
from dotenv import load_dotenv
from fastmcp import FastMCP
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

# Initialize the FastMCP server
mcp = FastMCP(
    name="ResearchMind",
    instructions=(
        "ResearchMind MCP Server — an open-source toolkit for autonomous research agents. "
        "Provides 7 tools: web search, web page reading, arXiv paper search, "
        "PDF extraction, content summarization, semantic memory, and citation tracking. "
        "Use these tools to research any topic, read sources, store findings, and produce cited reports."
    ),
)


# ============================================================
# Tool 1: Web Search (Brave Search API)
# ============================================================

@mcp.tool()
async def web_search(
    query: str,
    max_results: int = 5,
    freshness: Optional[str] = None,
) -> str:
    """
    Search the web using Brave Search API.

    Args:
        query: The search query string.
        max_results: Number of results to return (1-20, default 5).
        freshness: Time filter — 'pd' (past day), 'pw' (past week), 'pm' (past month), 'py' (past year).

    Returns structured results with title, URL, and description for each result.
    """
    from tools.web_search import search

    try:
        results = await search(query, max_results, freshness)
        return json.dumps(results, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "web_search"})


# ============================================================
# Tool 2: Web Reader (URL → Markdown)
# ============================================================

@mcp.tool()
async def web_reader(
    url: str,
    max_length: int = 8000,
) -> str:
    """
    Fetch a webpage and extract its content as clean Markdown.

    Use this after web_search to actually read the content of a page.
    Strips ads, navigation, and scripts — returns just the article content.

    Args:
        url: The URL to fetch and read.
        max_length: Maximum content length in characters (default 8000).

    Returns the page title and content in Markdown format.
    """
    from tools.web_reader import read_url

    try:
        result = await read_url(url, max_length)
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "web_reader", "url": url})


# ============================================================
# Tool 3: arXiv Paper Search
# ============================================================

@mcp.tool()
async def arxiv_search(
    query: str,
    max_results: int = 5,
    sort_by: str = "relevance",
    category: Optional[str] = None,
) -> str:
    """
    Search arXiv for academic papers. FREE — no API key needed.

    Use this when you need primary research sources, not just web articles.
    Returns paper titles, authors, abstracts, and PDF links.

    Args:
        query: Search query (e.g., 'transformer attention mechanism').
        max_results: Number of papers to return (1-20, default 5).
        sort_by: Sort order — 'relevance', 'lastUpdatedDate', or 'submittedDate'.
        category: Optional arXiv category (e.g., 'cs.AI', 'cs.LG', 'physics.gen-ph').

    Returns structured paper metadata including abstracts and PDF links.
    """
    from tools.arxiv_search import search_papers

    try:
        results = await search_papers(query, max_results, sort_by, category)
        return json.dumps(results, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "arxiv_search"})


# ============================================================
# Tool 4: PDF Reader
# ============================================================

@mcp.tool()
async def pdf_reader(
    source: str,
    max_pages: int = 20,
    start_page: int = 0,
) -> str:
    """
    Extract text from a PDF file (URL or local path).

    Use this to read academic papers, reports, or any PDF document.
    Returns chunked text that fits within LLM context limits.

    Args:
        source: URL to a PDF file, or a local file path.
        max_pages: Maximum pages to extract (default 20).
        start_page: Page to start from (0-indexed, default 0).

    Returns extracted text in chunks, along with metadata (title, author).
    """
    from tools.pdf_reader import read_pdf

    try:
        result = await read_pdf(source, max_pages, start_page=start_page)
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "pdf_reader", "source": source})


# ============================================================
# Tool 5: Summarizer
# ============================================================

@mcp.tool()
async def summarize_content(
    content: str,
    max_length: int = 500,
    focus: Optional[str] = None,
) -> str:
    """
    Summarize long content into concise key points.

    Uses Gemini 2.0 Flash (free tier) for summarization, with an extractive
    fallback if no API key is configured.

    Args:
        content: The text to summarize.
        max_length: Target summary length in characters (default 500).
        focus: Optional focus area (e.g., 'methodology', 'key findings').

    Returns a structured summary with key points.
    """
    from tools.summarizer import summarize

    try:
        result = await summarize(content, max_length, focus)
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "summarize_content"})


# ============================================================
# Tool 6: Memory Store (ChromaDB)
# ============================================================

@mcp.tool()
async def memory_save(
    content: str,
    metadata: Optional[dict] = None,
    doc_id: Optional[str] = None,
) -> str:
    """
    Save a piece of research finding to semantic memory.

    Use this to store key findings as you research. Stored content can be
    retrieved later via memory_query for synthesis.

    Args:
        content: The text content to store.
        metadata: Optional metadata (e.g., {"source": "url", "topic": "AI safety"}).
        doc_id: Optional custom ID. Auto-generated if not provided.

    Returns confirmation with the document ID.
    """
    from tools.memory_store import store

    try:
        result = await store(content, metadata, doc_id)
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "memory_save"})


@mcp.tool()
async def memory_query(
    query_text: str,
    max_results: int = 5,
) -> str:
    """
    Search the memory store using semantic similarity.

    Use this to retrieve previously stored findings that are relevant
    to a given query. Essential for the synthesis step.

    Args:
        query_text: What to search for (semantic similarity match).
        max_results: Maximum results to return (default 5).

    Returns relevant stored findings ranked by similarity.
    """
    from tools.memory_store import query

    try:
        results = await query(query_text, max_results)
        return json.dumps(results, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "memory_query"})


# ============================================================
# Tool 7: Citation Tracker
# ============================================================

@mcp.tool()
async def cite_source(
    url: str,
    title: str,
    excerpt: str = "",
    authors: Optional[list[str]] = None,
    published_date: Optional[str] = None,
    source_type: str = "web",
) -> str:
    """
    Track a source for citation. Automatically deduplicates by URL.

    Call this every time you reference a source. At the end, call
    get_bibliography to generate the full citations section.

    Args:
        url: The source URL.
        title: Title of the source.
        excerpt: A relevant snippet from the source.
        authors: Optional author names.
        published_date: Optional publication date.
        source_type: 'web', 'paper', 'pdf', or 'arxiv'.

    Returns the citation number and formatted reference.
    """
    from tools.citation_tracker import add_citation

    try:
        result = await add_citation(url, title, excerpt, authors, published_date, source_type)
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "cite_source"})


@mcp.tool()
async def get_bibliography(format: str = "markdown") -> str:
    """
    Generate a formatted bibliography of all tracked sources.

    Call this at the end of a research session to get the full citations
    section for your report.

    Args:
        format: Output format — 'markdown' or 'plain'.

    Returns a formatted bibliography string.
    """
    from tools.citation_tracker import get_bibliography as _get_bib

    try:
        result = await _get_bib(format)
        return result
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "get_bibliography"})
