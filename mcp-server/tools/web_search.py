"""
web_search.py — Web Search integration for ResearchMind MCP Server.

Uses Tavily Search as the primary provider (optimized for AI agents)
with a free fallback to DuckDuckGo if no Tavily API key is provided.
"""

import os
from typing import Optional
from duckduckgo_search import DDGS

async def search(
    query: str,
    max_results: int = 5,
    freshness: Optional[str] = None,
) -> list[dict]:
    """
    Search the web and return structured results.
    Primary: Tavily API
    Fallback: DuckDuckGo

    Args:
        query: The search query string.
        max_results: Maximum number of results to return (default 5).
        freshness: Optional time filter (used only by Tavily if mapped, otherwise ignored).

    Returns:
        A list of dicts with keys: title, url, description/excerpt.
    """
    max_results = max(1, min(20, max_results))
    tavily_api_key = os.getenv("TAVILY_API_KEY")

    if tavily_api_key:
        from tavily import TavilyClient
        client = TavilyClient(api_key=tavily_api_key)
        
        # We can map freshness if needed, but for simplicity we rely on default Tavily behavior
        # unless specifically mapped. Tavily doesn't natively use 'pd', 'pw', etc. exactly like Brave.
        
        # The Tavily wrapper may be synchronous, running it in async context
        import asyncio
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.search(query, max_results=max_results)
        )
        
        results = []
        for item in response.get("results", []):
            results.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "description": item.get("content", ""), # Tavily uses 'content' instead of 'description' usually
            })
        return results
    else:
        # Fallback to DuckDuckGo
        # DDGS is synchronous in its core text method
        import asyncio
        loop = asyncio.get_running_loop()
        
        def _ddgs_search():
            with DDGS() as ddg:
                # Need to map to a list to serialize from generator
                # Also handle freshness if possible. DDGS supports timelimit='d', 'w', 'm', 'y'
                timelimit = None
                if freshness:
                    if freshness == 'pd': timelimit = 'd'
                    elif freshness == 'pw': timelimit = 'w'
                    elif freshness == 'pm': timelimit = 'm'
                    elif freshness == 'py': timelimit = 'y'
                    
                return list(ddg.text(query, max_results=max_results, timelimit=timelimit))
                
        raw_results = await loop.run_in_executor(None, _ddgs_search)
        
        results = []
        for item in raw_results:
            results.append({
                "title": item.get("title", ""),
                "url": item.get("href", ""),      # DDG uses 'href'
                "description": item.get("body", ""), # DDG uses 'body'
            })
        return results
