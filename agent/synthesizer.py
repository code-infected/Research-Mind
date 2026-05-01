"""
synthesizer.py — Research report synthesis for ResearchMind.

Combines all research findings from memory into a structured,
cited research report using LiteLLM.
"""

import os
import sys
from typing import Optional
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "mcp-server"))

from .config import AgentConfig
from .llm import llm_complete


SYNTHESIS_PROMPT = """You are a senior research analyst writing a comprehensive, in-depth research report. Your report must be thorough, well-evidenced, and substantive — not a surface-level summary.

Topic: {topic}

Sub-questions researched:
{questions}

Research findings:
{findings}

You MUST follow these rules strictly:

## STRUCTURE (use Markdown):
1. **## Executive Summary** — A substantive 4-6 sentence overview of the key findings, their significance, and implications.
2. **## Introduction** — Set context for the topic. Why does it matter? What are the key dimensions being examined? (2-3 paragraphs)
3. **## [Thematic Section Title]** — Create 3-5 major thematic sections based on the findings. Each section MUST:
   - Have a descriptive title (NOT generic like "Findings")
   - Contain 2-4 detailed paragraphs
   - Include specific data points, statistics, quotes, and evidence from the findings
   - Cite sources with inline citations [1], [2], etc.
   - Analyze and interpret the findings, don't just list them
4. **## Analysis & Discussion** — Synthesize the findings across sections. Identify patterns, contradictions, gaps in the research, and implications.
5. **## Key Takeaways** — 5-8 specific, substantive bullet points (not generic platitudes)
6. **## Conclusion** — 2-3 paragraphs summarizing the state of knowledge and suggesting areas for further research.

## QUALITY REQUIREMENTS:
- **Length**: The report MUST be at least 1,500 words. Aim for 2,000-3,000 words. Short, superficial reports are unacceptable.
- **Evidence**: Every claim must cite its source with [N] notation. Include specific numbers, percentages, dates, and names.
- **Depth**: Go beyond listing facts — analyze WHY findings matter, HOW they connect, and WHAT they imply.
- **Objectivity**: If findings conflict, present both sides with evidence. Do not take sides without evidence.
- **Tone**: Professional, analytical, and authoritative. Write as if for a decision-maker who needs comprehensive understanding.
- Do NOT fabricate information. Only use what is provided in the findings above.
- Keep total length under {max_length} characters.

Write the full, detailed research report now:"""


async def synthesize_report(
    topic: str,
    questions: list[str],
    config: Optional[AgentConfig] = None,
    session_id: str = "default",
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
    from tools.citation_tracker import get_bibliography, get_citation_count, get_all_citations

    all_findings = []
    for question in questions:
        results = await memory_query(question, max_results=config.max_memory_results, session_id=session_id)
        for result in results:
            all_findings.append(result.get("content", ""))

    unique_findings = _deduplicate_findings(all_findings)

    # Handle empty findings gracefully
    if not unique_findings:
        report = _empty_findings_report(topic, questions)
        bibliography = await get_bibliography(format=config.report_format, session_id=session_id)
        citation_count = await get_citation_count(session_id=session_id)
        bibliography_structured = await get_all_citations(session_id=session_id)
        word_count = len(report.split())
        return {
            "report": report,
            "bibliography": bibliography,
            "bibliography_structured": bibliography_structured,
            "metadata": {
                "topic": topic,
                "questions_researched": len(questions),
                "findings_used": 0,
                "sources_cited": citation_count,
                "word_count": word_count,
                "char_count": len(report),
            },
        }

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
            max_tokens=config.report_max_tokens,
        )
    except Exception:
        report = _fallback_synthesis(topic, questions, unique_findings)

    bibliography = await get_bibliography(format=config.report_format, session_id=session_id)
    citation_count = await get_citation_count(session_id=session_id)
    bibliography_structured = await get_all_citations(session_id=session_id)

    word_count = len(report.split())

    return {
        "report": report,
        "bibliography": bibliography,
        "bibliography_structured": bibliography_structured,
        "metadata": {
            "topic": topic,
            "questions_researched": len(questions),
            "findings_used": len(unique_findings),
            "sources_cited": citation_count,
            "word_count": word_count,
            "char_count": len(report),
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


def _empty_findings_report(topic: str, questions: list[str]) -> str:
    """Return a placeholder report when no findings were gathered."""
    sections = [
        f"# Research Report: {topic}\n",
        "## Executive Summary\n",
        f"Research was initiated on **{topic}**, but no findings could be gathered from the available sources. "
        "This may be due to network issues, search limitations, or the topic being too niche.\n",
        "## Attempted Research Questions\n",
    ]
    for q in questions:
        sections.append(f"- {q}\n")
    sections.extend([
        "## Key Takeaways\n",
        "- No sources could be successfully retrieved for this topic\n",
        "- Try rephrasing the topic or checking your network connection\n",
        "- Consider breaking the topic into more specific sub-questions\n",
    ])
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
