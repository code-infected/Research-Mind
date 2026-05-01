"""
planner.py — Research topic decomposition for ResearchMind.

Takes a broad research topic and decomposes it into focused sub-questions
that the executor can research independently. Uses LiteLLM for
intelligent topic decomposition with multi-provider support.
"""

import json
import re
from typing import Optional

from .config import AgentConfig
from .llm import llm_complete


PLANNING_PROMPT = """You are a research planning assistant. Given a research topic, decompose it into {max_questions} focused, specific sub-questions that together would provide comprehensive coverage of the topic.

Rules:
1. Each sub-question should be independently researchable
2. Questions should cover different aspects (background, current state, key findings, practical applications, open problems)
3. Questions should be specific enough for a web search to return useful results
4. Order questions from foundational/background to advanced/current
5. Return ONLY a JSON array of strings, no other text

Research topic: {topic}

Additional context from user (if any): {context}

Return your response as a JSON array of question strings:"""


async def decompose_topic(
    topic: str,
    config: Optional[AgentConfig] = None,
    context: str = "",
) -> list[str]:
    """
    Decompose a research topic into focused sub-questions.

    Args:
        topic: The broad research topic to decompose.
        config: Optional agent configuration. Uses defaults if not provided.
        context: Optional additional context or constraints from the user.

    Returns:
        A list of focused research sub-questions.
    """
    if config is None:
        config = AgentConfig.from_env()

    prompt = PLANNING_PROMPT.format(
        max_questions=config.max_sub_questions,
        topic=topic,
        context=context or "None",
    )

    try:
        text = await llm_complete(
            prompt=prompt,
            temperature=0.3,
            max_tokens=1024,
        )
        questions = _parse_questions(text)
        if questions:
            # Enforce max_questions limit to prevent runaway research
            return questions[:config.max_sub_questions]
    except Exception:
        pass

    # Fallback: template-based decomposition
    return _fallback_decomposition(topic, config.max_sub_questions)


def _parse_questions(text: str) -> list[str]:
    """Parse a JSON array of questions from LLM response text."""
    cleaned = text.strip()

    # Strip markdown code fences if present
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        cleaned = cleaned.strip()

    # Try direct JSON parse
    try:
        questions = json.loads(cleaned)
        if isinstance(questions, list):
            return [str(q) for q in questions if q]
    except json.JSONDecodeError:
        pass

    # Try extracting JSON array from text
    match = re.search(r'\[.*\]', cleaned, re.DOTALL)
    if match:
        try:
            questions = json.loads(match.group())
            return [str(q) for q in questions if q]
        except json.JSONDecodeError:
            pass

    return []


def _fallback_decomposition(topic: str, max_questions: int) -> list[str]:
    """Generate basic research questions when no LLM is available."""
    templates = [
        f"What is {topic} and what are its fundamental concepts?",
        f"What is the current state of research on {topic}?",
        f"What are the key findings and breakthroughs in {topic}?",
        f"What are the practical applications of {topic}?",
        f"What are the open problems and future directions in {topic}?",
        f"Who are the leading researchers and organizations working on {topic}?",
        f"What are the main challenges and limitations of {topic}?",
    ]
    return templates[:max_questions]
