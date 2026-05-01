"""
Shared rate limiter configuration for ResearchMind API.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Rate limiter using remote address as key
limiter = Limiter(key_func=get_remote_address)
