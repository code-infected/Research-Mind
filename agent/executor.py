"""
executor.py — Tool call execution loop for ResearchMind.

The executor takes a list of sub-questions from the planner and
researches each one by calling MCP tools in sequence:
  web_search → web_reader → arxiv_search → summarizer → memory_store → cite_source

Features retry with backoff and fallback between tools.
Yields streaming events for real-time UI updates.
"""

import sys
import os
import json
import asyncio
import traceback
import logging
import hashlib
from typing import AsyncGenerator, Optional
from dataclasses import dataclass
from datetime import datetime, timezone

# Add mcp-server to path so we can import tools
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "mcp-server"))

from .config import AgentConfig


@dataclass
class AgentEvent:
    """A streaming event from the agent execution."""
    type: str  # "plan", "tool_start", "tool_result", "tool_error", "finding", "status"
    tool: str = ""
    question: str = ""
    data: dict = None
    timestamp: str = ""

    def __post_init__(self):
        if self.data is None:
            self.data = {}
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return {
            "type": self.type,
            "tool": self.tool,
            "question": self.question,
            "data": self.data,
            "timestamp": self.timestamp,
        }


async def execute_research(
    questions: list[str],
    config: Optional[AgentConfig] = None,
    session_id: str = "default",
) -> AsyncGenerator[AgentEvent, None]:
    """
    Execute research for a list of sub-questions.

    Yields AgentEvent objects for each step, enabling real-time UI streaming.

    Args:
        questions: List of focused research sub-questions from the planner.
        config: Optional agent configuration.
        session_id: Unique identifier for the research session (used for citation scoping).

    Yields:
        AgentEvent objects for each step of the research process.
    """
    if config is None:
        config = AgentConfig.from_env()

    # Import tools
    from tools.web_search import search as web_search
    from tools.web_reader import read_url
    from tools.arxiv_search import search_papers
    from tools.pdf_reader import read_pdf
    from tools.summarizer import summarize
    from tools.memory_store import store as memory_store
    from tools.citation_tracker import add_citation

    yield AgentEvent(
        type="status",
        data={"message": f"Starting research on {len(questions)} sub-questions"},
    )

    # Cross-question URL deduplication — prevents re-reading same sources
    seen_urls = set()

    for q_idx, question in enumerate(questions):
        seen_content_hashes = set()
        tool_call_count = 0
        sources_read = 0

        yield AgentEvent(
            type="status",
            question=question,
            data={
                "message": f"Researching question {q_idx + 1}/{len(questions)}",
                "question_number": q_idx + 1,
                "total_questions": len(questions),
            },
        )

        # ----- Step 1: Web Search -----
        search_results = []
        yield AgentEvent(type="tool_start", tool="web_search", question=question)

        try:
            search_results = await _retry(
                lambda: web_search(question, max_results=config.max_sources_per_question * 2),
                max_retries=config.max_retries,
                backoff=config.retry_backoff_seconds,
            )
            tool_call_count += 1
            yield AgentEvent(
                type="tool_result",
                tool="web_search",
                question=question,
                data={"results_count": len(search_results), "results": search_results},
            )
        except Exception as e:
            yield AgentEvent(
                type="tool_error",
                tool="web_search",
                question=question,
                data={"error": str(e)},
            )

        # ----- Step 2: Read top web results -----
        for result in search_results:
            if tool_call_count >= config.max_tool_calls_per_question:
                break
            if sources_read >= config.max_sources_per_question:
                break

            url = result.get("url", "")
            title = result.get("title", "")

            if not url:
                continue

            if url in seen_urls:
                logging.warning(f"Skipping duplicate URL: {url}")
                continue
            seen_urls.add(url)

            yield AgentEvent(
                type="tool_start",
                tool="web_reader",
                question=question,
                data={"url": url, "title": title},
            )

            try:
                page_content = await _retry(
                    lambda u=url: read_url(u, max_length=6000),
                    max_retries=2,
                    backoff=config.retry_backoff_seconds,
                )
                tool_call_count += 1

                content_text = page_content.get("content", "")

                yield AgentEvent(
                    type="tool_result",
                    tool="web_reader",
                    question=question,
                    data={
                        "url": url,
                        "title": page_content.get("title", title),
                        "content_length": len(content_text),
                    },
                )

                # Summarize the content
                if content_text and len(content_text) > 200:
                    content_hash = hashlib.md5(content_text[:500].encode()).hexdigest()
                    if content_hash in seen_content_hashes:
                        logging.warning(f"Skipping duplicate content hash: {content_hash}")
                        continue
                    seen_content_hashes.add(content_hash)

                    yield AgentEvent(
                        type="tool_start",
                        tool="summarizer",
                        question=question,
                        data={"source": title},
                    )

                    summary_result = await summarize(content_text, max_length=2000, focus=question)
                    tool_call_count += 1
                    sources_read += 1
                    summary_text = summary_result.get("summary", "")

                    yield AgentEvent(
                        type="tool_result",
                        tool="summarizer",
                        question=question,
                        data={"summary_length": len(summary_text)},
                    )

                    # Store in memory
                    if summary_text:
                        await memory_store(
                            content=f"Question: {question}\nSource: {title}\nURL: {url}\n\nFindings:\n{summary_text}",
                            metadata={
                                "question": question,
                                "source_url": url,
                                "source_title": title,
                                "source_type": "web",
                            },
                            session_id=session_id,
                        )

                        # Track citation
                        await add_citation(
                            url=url,
                            title=page_content.get("title", title),
                            excerpt=summary_text[:200],
                            source_type="web",
                            session_id=session_id,
                        )

                        yield AgentEvent(
                            type="finding",
                            tool="executor",
                            question=question,
                            data={
                                "source": title,
                                "url": url,
                                "summary": summary_text,
                            },
                        )

            except Exception as e:
                yield AgentEvent(
                    type="tool_error",
                    tool="web_reader",
                    question=question,
                    data={"error": str(e), "url": url},
                )

        # ----- Step 3: arXiv Search (if enabled) -----
        if config.include_arxiv:
            yield AgentEvent(type="tool_start", tool="arxiv_search", question=question)

            try:
                papers = await _retry(
                    lambda: search_papers(question, max_results=2),
                    max_retries=2,
                    backoff=config.retry_backoff_seconds,
                )
                tool_call_count += 1

                yield AgentEvent(
                    type="tool_result",
                    tool="arxiv_search",
                    question=question,
                    data={"papers_found": len(papers)},
                )

                for paper in papers[:2]:
                    if tool_call_count >= config.max_tool_calls_per_question:
                        break
                    if sources_read >= config.max_sources_per_question:
                        break

                    paper_title = paper.get("title", "")
                    paper_url = paper.get("url", "")
                    pdf_url = paper.get("pdf_url", "")
                    abstract = paper.get("abstract", "")
                    authors = paper.get("authors", [])

                    if not paper_url:
                        continue

                    if paper_url in seen_urls:
                        logging.warning(f"Skipping duplicate arXiv URL: {paper_url}")
                        continue
                    seen_urls.add(paper_url)

                    if abstract:
                        # Store paper finding in memory
                        finding = (
                            f"Question: {question}\n"
                            f"Paper: {paper_title}\n"
                            f"Authors: {', '.join(authors[:3])}\n"
                            f"URL: {paper_url}\n\n"
                            f"Abstract:\n{abstract}"
                        )

                        await memory_store(
                            content=finding,
                            metadata={
                                "question": question,
                                "source_url": paper_url,
                                "source_title": paper_title,
                                "source_type": "arxiv",
                            },
                            session_id=session_id,
                        )

                        await add_citation(
                            url=paper_url,
                            title=paper_title,
                            excerpt=abstract[:200],
                            authors=authors,
                            source_type="arxiv",
                            session_id=session_id,
                        )

                        yield AgentEvent(
                            type="finding",
                            tool="arxiv_search",
                            question=question,
                            data={
                                "source": paper_title,
                                "url": paper_url,
                                "type": "paper",
                                "authors": authors[:3],
                            },
                        )

                    # ----- Step 3b: Read PDF if available -----
                    if pdf_url and tool_call_count < config.max_tool_calls_per_question and sources_read < config.max_sources_per_question:
                        yield AgentEvent(type="tool_start", tool="pdf_reader", question=question)
                        try:
                            pdf_data = await _retry(
                                lambda u=pdf_url, m=config.max_pages_per_pdf: read_pdf(u, max_pages=m),
                                max_retries=1,
                                backoff=config.retry_backoff_seconds,
                            )
                            tool_call_count += 1

                            chunks = pdf_data.get("chunks", [])
                            if chunks:
                                pdf_text = "\n\n".join(chunks[:3])
                                pdf_summary = await summarize(pdf_text, max_length=2000, focus=question)
                                tool_call_count += 1
                                sources_read += 1
                                summary_text = pdf_summary.get("summary", "")

                                yield AgentEvent(
                                    type="tool_result",
                                    tool="pdf_reader",
                                    question=question,
                                    data={"pages": pdf_data.get("pages_extracted", 0), "chunks": len(chunks)},
                                )

                                if summary_text:
                                    await memory_store(
                                        content=f"Question: {question}\nPaper: {paper_title}\nURL: {pdf_url}\n\nFindings:\n{summary_text}",
                                        metadata={
                                            "question": question,
                                            "source_url": pdf_url,
                                            "source_title": paper_title,
                                            "source_type": "pdf",
                                        },
                                        session_id=session_id,
                                    )

                                    await add_citation(
                                        url=pdf_url,
                                        title=paper_title,
                                        excerpt=summary_text[:200],
                                        authors=authors,
                                        source_type="pdf",
                                        session_id=session_id,
                                    )

                                    yield AgentEvent(
                                        type="finding",
                                        tool="pdf_reader",
                                        question=question,
                                        data={
                                            "source": paper_title,
                                            "url": pdf_url,
                                            "type": "pdf",
                                            "summary": summary_text,
                                        },
                                    )
                        except Exception as e:
                            yield AgentEvent(
                                type="tool_error",
                                tool="pdf_reader",
                                question=question,
                                data={"error": str(e), "url": pdf_url},
                            )

            except Exception as e:
                yield AgentEvent(
                    type="tool_error",
                    tool="arxiv_search",
                    question=question,
                    data={"error": str(e)},
                )

    yield AgentEvent(
        type="status",
        data={"message": "Research execution complete. Ready for synthesis."},
    )


async def _retry(fn, max_retries: int = 3, backoff: float = 1.0):
    """Retry an async function with exponential backoff."""
    last_error = None

    for attempt in range(max_retries):
        try:
            return await fn()
        except Exception as e:
            last_error = e
            if attempt < max_retries - 1:
                await asyncio.sleep(backoff * (2 ** attempt))

    raise last_error
