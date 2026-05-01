"""
summarizer.py — LLM-powered content condensing for ResearchMind MCP Server.

Takes long-form content and produces concise summaries using LiteLLM.
Falls back to extractive summarization if LLM calls fail.
"""

import os
import re
from typing import Optional

try:
    from agent.llm import llm_complete, get_model
except ImportError:
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
    from agent.llm import llm_complete, get_model


SUMMARY_PROMPT = """You are a research assistant. Extract and summarize the key information from the following content.

Rules:
- Extract ALL important facts, findings, statistics, dates, names, and conclusions
- Preserve specific numbers, percentages, and quantitative data exactly
- Include methodology details and study specifics if present
- Use bullet points organized by topic/theme
- Include direct quotes for particularly important claims
- Keep the summary under {max_length} characters
- Do NOT add information not present in the original content
- Do NOT generalize — be specific

Content to summarize:
---
{content}
---

Provide a detailed, evidence-rich summary:"""


async def summarize(
    content: str,
    max_length: int = 1500,
    focus: Optional[str] = None,
) -> dict:
    """
    Summarize content using an LLM.

    Args:
        content: The text content to summarize.
        max_length: Target maximum length for the summary in characters (default 500).
        focus: Optional focus area to guide the summary.

    Returns:
        A dict with keys: summary, original_length, summary_length, model.
    """
    if not content or not content.strip():
        return {
            "summary": "",
            "original_length": 0,
            "summary_length": 0,
            "model": "none",
        }

    prompt = SUMMARY_PROMPT.format(
        max_length=max_length,
        content=content[:20000],
    )

    if focus:
        prompt += f"\n\nFocus especially on: {focus}"

    try:
        summary = await llm_complete(
            prompt=prompt,
            temperature=0.3,
            max_tokens=1024,
        )
        model = get_model()
    except Exception:
        summary = _extractive_summary(content, max_length)
        model = "extractive-fallback"

    return {
        "summary": summary,
        "original_length": len(content),
        "summary_length": len(summary),
        "model": model,
    }


def _extractive_summary(text: str, max_length: int) -> str:
    """Basic extractive summary as a fallback when LLM is unavailable."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    if not sentences:
        return ""

    scored = []
    for i, sentence in enumerate(sentences):
        score = len(sentence.split())
        if i < 3:
            score *= 1.5
        if i >= len(sentences) - 2:
            score *= 1.3
        scored.append((score, i, sentence))

    scored.sort(reverse=True)
    selected = []
    current_length = 0
    top_sentences = sorted(scored[:10], key=lambda x: x[1])

    for score, idx, sentence in top_sentences:
        if current_length + len(sentence) > max_length:
            break
        selected.append(sentence)
        current_length += len(sentence)

    return " ".join(selected) if selected else sentences[0][:max_length]
