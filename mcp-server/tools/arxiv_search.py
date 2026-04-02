"""
arxiv_search.py — arXiv API paper search for ResearchMind MCP Server.

Searches academic papers on arXiv using their free, no-API-key-required API.
This is the unique differentiator — the agent can find *primary research sources*,
not just web articles.
"""

import httpx
import feedparser
from typing import Optional


ARXIV_API_URL = "https://export.arxiv.org/api/query"


async def search_papers(
    query: str,
    max_results: int = 5,
    sort_by: str = "relevance",
    category: Optional[str] = None,
) -> list[dict]:
    """
    Search arXiv for academic papers.

    Args:
        query: Search query (supports full arXiv query syntax).
        max_results: Maximum number of papers to return (1-20, default 5).
        sort_by: Sort order — 'relevance', 'lastUpdatedDate', or 'submittedDate'.
        category: Optional arXiv category filter (e.g., 'cs.AI', 'cs.LG', 'physics.gen-ph').

    Returns:
        A list of dicts with keys: title, authors, abstract, url, pdf_url,
        published, categories.

    Example:
        >>> results = await search_papers("transformer attention mechanism", max_results=3)
        >>> results[0]["title"]
        'Attention Is All You Need'
    """
    max_results = max(1, min(20, max_results))

    sort_map = {
        "relevance": "relevance",
        "lastUpdatedDate": "lastUpdatedDate",
        "submittedDate": "submittedDate",
    }
    sort_order = sort_map.get(sort_by, "relevance")

    # Build arXiv query
    search_query = f"all:{query}"
    if category:
        search_query = f"cat:{category} AND all:{query}"

    params = {
        "search_query": search_query,
        "start": 0,
        "max_results": max_results,
        "sortBy": sort_order,
        "sortOrder": "descending",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(ARXIV_API_URL, params=params)
        response.raise_for_status()

    # Parse Atom feed
    feed = feedparser.parse(response.text)

    results = []
    for entry in feed.entries:
        # Extract authors
        authors = [author.get("name", "") for author in entry.get("authors", [])]

        # Find PDF link
        pdf_url = ""
        for link in entry.get("links", []):
            if link.get("type") == "application/pdf":
                pdf_url = link.get("href", "")
                break
            elif link.get("href", "").endswith(".pdf"):
                pdf_url = link.get("href", "")
                break

        # Extract categories
        categories = [tag.get("term", "") for tag in entry.get("tags", [])]

        # Clean abstract
        abstract = entry.get("summary", "").strip()
        abstract = " ".join(abstract.split())  # Normalize whitespace

        results.append({
            "title": entry.get("title", "").strip(),
            "authors": authors,
            "abstract": abstract,
            "url": entry.get("link", ""),
            "pdf_url": pdf_url,
            "published": entry.get("published", ""),
            "categories": categories,
        })

    return results
