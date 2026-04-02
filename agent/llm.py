"""
llm.py — LiteLLM abstraction layer for ResearchMind.

All model configuration comes from .env — nothing is hardcoded.
Change models without touching code.
"""

import os
import logging
import litellm
from litellm import acompletion

litellm.suppress_debug_info = True


def get_model() -> str:
    """
    Get the current LLM model from env.

    Priority:
    1. LLM_MODEL set + has provider prefix → use as-is
    2. LLM_MODEL set + no provider prefix → auto-prefix with LLM_PROVIDER
    3. LLM_PROVIDER only set → build default model string from provider
    4. Nothing set → groq/llama-3.3-70b-versatile (last resort)
    """
    custom_model = os.getenv("LLM_MODEL", "").strip()
    provider = os.getenv("LLM_PROVIDER", "groq").strip()

    if custom_model:
        known_prefixes = ["groq/", "gemini/", "openrouter/", "anthropic/", "claude/"]
        has_prefix = any(custom_model.startswith(p) for p in known_prefixes)
        
        if has_prefix:
            # Special case: OpenRouter native models (e.g., openrouter/hunter-alpha) 
            # If the model has exactly one slash and starts with openrouter/, Litellm will strip it 
            # and send a truncated ID. We must double the prefix to preserve the model ID.
            if custom_model.startswith("openrouter/") and custom_model.count("/") == 1:
                resolved = f"openrouter/{custom_model}"
            else:
                resolved = custom_model
        else:
            resolved = f"{provider}/{custom_model}"
    else:
        resolved = f"{provider}/llama-3.3-70b-versatile"

    logging.info(f"Using model: {resolved}")
    return resolved


def get_fallbacks() -> list[str]:
    """
    Get fallback chain from LLM_FALLBACK_MODELS env variable.
    Comma separated list of full LiteLLM model strings.
    Returns empty list if not set — LiteLLM skips fallbacks gracefully.

    Example:
    LLM_FALLBACK_MODELS=groq/llama-3.3-70b-versatile,gemini/gemini-2.0-flash
    """
    raw = os.getenv("LLM_FALLBACK_MODELS", "").strip()
    if not raw:
        return []
    fallbacks = [m.strip() for m in raw.split(",") if m.strip()]
    logging.info(f"Fallback chain: {fallbacks}")
    return fallbacks


async def llm_complete(
    prompt: str,
    temperature: float = 0.4,
    max_tokens: int = 4096,
    system: str = "",
) -> str:
    """
    Call the configured LLM with automatic fallback.

    Args:
        prompt: The user message / prompt.
        temperature: Sampling temperature (default 0.4).
        max_tokens: Maximum output tokens (default 4096).
        system: Optional system message.

    Returns:
        The LLM response text.
    """
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = await acompletion(
        model=get_model(),
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        fallbacks=get_fallbacks(),
    )

    return response.choices[0].message.content.strip()
