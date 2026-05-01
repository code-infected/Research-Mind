"""
config.py — Agent configuration for ResearchMind.

Central configuration for the research agent — model settings,
retry policies, and tool preferences.
"""

import os
from dataclasses import dataclass


@dataclass
class AgentConfig:
    """Configuration for the ResearchMind research agent."""

    # === LLM Settings ===
    llm_provider: str = "groq"
    temperature: float = 0.4
    max_tokens: int = 4096
    report_max_tokens: int = 8192

    # === Research Settings ===
    max_sub_questions: int = 5
    max_tool_calls_per_question: int = 5
    max_sources_per_question: int = 3
    include_arxiv: bool = True
    max_pages_per_pdf: int = 15

    # === Retry / Fallback ===
    max_retries: int = 3
    retry_backoff_seconds: float = 1.0
    fallback_on_search_failure: bool = True

    # === Memory ===
    chroma_db_path: str = "./chroma_data"
    max_memory_results: int = 20

    # === Output ===
    report_format: str = "markdown"
    include_bibliography: bool = True
    max_report_length: int = 15000

    @classmethod
    def from_env(cls) -> "AgentConfig":
        """Create config from environment variables (with defaults)."""
        return cls(
            llm_provider=os.getenv("LLM_PROVIDER", "groq"),
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.4")),
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", "4096")),
            report_max_tokens=int(os.getenv("REPORT_MAX_TOKENS", "8192")),
            max_sub_questions=int(os.getenv("MAX_SUB_QUESTIONS", "5")),
            max_tool_calls_per_question=int(os.getenv("MAX_TOOL_CALLS_PER_QUESTION", "5")),
            max_sources_per_question=int(os.getenv("MAX_SOURCES_PER_QUESTION", "3")),
            include_arxiv=os.getenv("INCLUDE_ARXIV", "true").lower() == "true",
            chroma_db_path=os.getenv("CHROMA_DB_PATH", "./chroma_data"),
            max_report_length=int(os.getenv("MAX_REPORT_LENGTH", "15000")),
        )
