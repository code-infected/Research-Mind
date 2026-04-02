"""
web_reader.py — URL-to-Markdown content extractor for ResearchMind MCP Server.

Fetches a webpage and converts it to clean Markdown that an LLM can process.
This is the critical missing piece — the agent can search the web but needs
this tool to actually *read* the pages it finds.
"""

import re
import httpx
from bs4 import BeautifulSoup
from typing import Optional


# Tags that contain the main content on most pages
CONTENT_TAGS = [
    "article", "main", "[role='main']",
    ".post-content", ".article-content", ".entry-content",
    "#content", ".content",
]

# Tags to strip entirely (they add noise, not content)
NOISE_TAGS = [
    "script", "style", "nav", "header", "footer",
    "aside", "form", "iframe", "noscript",
    ".sidebar", ".menu", ".navigation", ".comments",
    ".advertisement", ".ad", ".popup",
]


def _html_to_markdown(html: str, base_url: str = "") -> str:
    """Convert HTML to clean Markdown text."""
    soup = BeautifulSoup(html, "html.parser")

    # Remove noise elements
    for selector in NOISE_TAGS:
        for el in soup.select(selector):
            el.decompose()

    # Try to find main content container
    content = None
    for selector in CONTENT_TAGS:
        found = soup.select_one(selector)
        if found and len(found.get_text(strip=True)) > 200:
            content = found
            break

    if content is None:
        content = soup.body or soup

    lines: list[str] = []

    for element in content.descendants:
        if element.name is None:
            # Text node
            text = element.strip() if isinstance(element, str) else ""
            if text:
                lines.append(text)
        elif element.name in ("h1", "h2", "h3", "h4", "h5", "h6"):
            level = int(element.name[1])
            text = element.get_text(strip=True)
            if text:
                lines.append(f"\n{'#' * level} {text}\n")
        elif element.name == "p":
            text = element.get_text(strip=True)
            if text:
                lines.append(f"\n{text}\n")
        elif element.name == "li":
            text = element.get_text(strip=True)
            if text:
                lines.append(f"- {text}")
        elif element.name == "a":
            href = element.get("href", "")
            text = element.get_text(strip=True)
            if text and href and href.startswith("http"):
                lines.append(f"[{text}]({href})")
        elif element.name == "blockquote":
            text = element.get_text(strip=True)
            if text:
                lines.append(f"> {text}")
        elif element.name in ("strong", "b"):
            text = element.get_text(strip=True)
            if text:
                lines.append(f"**{text}**")
        elif element.name in ("em", "i"):
            text = element.get_text(strip=True)
            if text:
                lines.append(f"*{text}*")
        elif element.name in ("code", "pre"):
            text = element.get_text(strip=True)
            if text:
                lines.append(f"`{text}`")

    markdown = "\n".join(lines)

    # Clean up excessive whitespace
    markdown = re.sub(r"\n{3,}", "\n\n", markdown)
    markdown = re.sub(r" {2,}", " ", markdown)

    return markdown.strip()


async def read_url(
    url: str,
    max_length: int = 8000,
    timeout: float = 15.0,
) -> dict:
    """
    Fetch a webpage and convert it to clean Markdown.

    Args:
        url: The URL to fetch and extract content from.
        max_length: Maximum character length of the extracted content (default 8000).
                    Keeps token costs manageable.
        timeout: Request timeout in seconds.

    Returns:
        A dict with keys: url, title, content (Markdown), content_length, truncated.

    Raises:
        httpx.HTTPStatusError: If the page returns an error status.
        httpx.TimeoutException: If the request times out.
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
    }

    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True,
        max_redirects=5,
    ) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()

    # Extract title
    soup = BeautifulSoup(response.text, "html.parser")
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""

    # Convert to markdown
    content = _html_to_markdown(response.text, base_url=url)

    # Truncate if needed
    truncated = False
    if len(content) > max_length:
        content = content[:max_length].rsplit("\n", 1)[0] + "\n\n[... content truncated]"
        truncated = True

    return {
        "url": str(response.url),
        "title": title,
        "content": content,
        "content_length": len(content),
        "truncated": truncated,
    }
