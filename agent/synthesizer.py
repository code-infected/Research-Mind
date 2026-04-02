"""
synthesizer.py — Research report synthesis for ResearchMind.

Combines all research findings from memory into a structured,
cited research report using LiteLLM.
"""

import os
import sys
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "mcp-server"))

from .config import AgentConfig
from .llm import llm_complete


SYNTHESIS_PROMPT = """You are a research report writer. Using the findings below, write a comprehensive yet concise research report on the topic.

Topic: {topic}

Sub-questions researched:
{questions}

Research findings:
{findings}

Rules:
1. Structure the report with clear sections using Markdown headers (##, ###)
2. Start with an Executive Summary (2-3 sentences)
3. Organize findings logically by theme, not by source
4. Use inline citations like [1], [2] referencing the source numbers
5. Include specific data points, numbers, and facts from the findings
6. End with a "Key Takeaways" section (3-5 bullet points)
7. Keep the total report under {max_length} characters
8. Write in a professional but accessible tone
9. Do NOT make up information — only use what's in the findings
10. If findings conflict, acknowledge the disagreement

Write the report now:"""


async def synthesize_report(
    topic: str,
    questions: list[str],
    config: Optional[AgentConfig] = None,
) -> dict:
    """
    Synthesize a research report from all findings in memory.

    Args:
        topic: The original research topic.
        questions: The sub-questions that were researched.
        config: Optional agent configuration.

    Returns:
        A dict with keys: report, bibliography, metadata.
    """
    if config is None:
        config = AgentConfig.from_env()

    from tools.memory_store import query as memory_query
    from tools.citation_tracker import get_bibliography, get_citation_count

    all_findings = []
    for question in questions:
        results = await memory_query(question, max_results=config.max_memory_results)
        for result in results:
            all_findings.append(result.get("content", ""))

    unique_findings = _deduplicate_findings(all_findings)

    findings_text = "\n\n---\n\n".join(
        f"Finding {i+1}:\n{finding}"
        for i, finding in enumerate(unique_findings)
    )
    questions_text = "\n".join(f"- {q}" for q in questions)

    prompt = SYNTHESIS_PROMPT.format(
        topic=topic,
        questions=questions_text,
        findings=findings_text,
        max_length=config.max_report_length,
    )

    try:
        report = await llm_complete(
            prompt=prompt,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
        )
    except Exception:
        report = _fallback_synthesis(topic, questions, unique_findings)

    bibliography = await get_bibliography(format=config.report_format)
    citation_count = await get_citation_count()

    full_report = f"{report}\n\n---\n\n{bibliography}"
    word_count = len(full_report.split())

    return {
        "report": full_report,
        "bibliography": bibliography,
        "metadata": {
            "topic": topic,
            "questions_researched": len(questions),
            "findings_used": len(unique_findings),
            "sources_cited": citation_count,
            "word_count": word_count,
            "char_count": len(full_report),
        },
    }


def _fallback_synthesis(topic: str, questions: list[str], findings: list[str]) -> str:
    """Create a structured report without an LLM (fallback)."""
    sections = [
        f"# Research Report: {topic}\n",
        "## Executive Summary\n",
        f"This report presents findings from research on **{topic}**, "
        f"covering {len(questions)} key aspects of the topic.\n",
        "## Research Findings\n",
    ]
    for i, (question, finding) in enumerate(zip(questions, findings)):
        sections.append(f"### {question}\n")
        sections.append(f"{finding}\n")
    if len(findings) > len(questions):
        sections.append("### Additional Findings\n")
        for finding in findings[len(questions):]:
            sections.append(f"{finding}\n")
    sections.append("## Key Takeaways\n")
    sections.append(
        "- Further analysis is recommended for comprehensive conclusions\n"
        "- Multiple sources were consulted across web and academic databases\n"
        "- See the bibliography below for all referenced sources\n"
    )
    return "\n".join(sections)


def _deduplicate_findings(findings: list[str]) -> list[str]:
    """Remove near-duplicate findings using Jaccard similarity."""
    if not findings:
        return []
    unique = [findings[0]]
    for finding in findings[1:]:
        is_duplicate = False
        finding_words = set(finding.lower().split())
        for existing in unique:
            existing_words = set(existing.lower().split())
            if not finding_words or not existing_words:
                continue
            overlap = len(finding_words & existing_words)
            union = len(finding_words | existing_words)
            if union > 0 and (overlap / union) > 0.7:
                is_duplicate = True
                break
        if not is_duplicate:
            unique.append(finding)
    return unique
