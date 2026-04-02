"""
auth.py — Clerk JWT authentication for ResearchMind.

Verifies Clerk session tokens using JWKS (JSON Web Key Sets).
Works as a FastAPI dependency — inject into any route that needs auth.

The frontend sends the Clerk session token in the Authorization header.
This module fetches Clerk's public keys and validates the JWT.
"""

import os
import time
from typing import Optional

import httpx
import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .database import get_db
from .models import User


# Cache JWKS keys in memory
_jwks_cache: dict = {}
_jwks_cache_expires: float = 0
JWKS_CACHE_TTL = 3600  # 1 hour


async def _get_clerk_jwks() -> dict:
    """Fetch and cache Clerk's JWKS (JSON Web Key Set)."""
    global _jwks_cache, _jwks_cache_expires

    if _jwks_cache and time.time() < _jwks_cache_expires:
        return _jwks_cache

    clerk_frontend_api = os.getenv("CLERK_FRONTEND_API", "")
    if not clerk_frontend_api:
        raise HTTPException(
            status_code=500,
            detail="CLERK_FRONTEND_API not configured"
        )

    # Clerk JWKS URL format
    jwks_url = f"https://{clerk_frontend_api}/.well-known/jwks.json"

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(jwks_url)
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_cache_expires = time.time() + JWKS_CACHE_TTL

    return _jwks_cache


def _extract_token(request: Request) -> Optional[str]:
    """Extract Bearer token from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


async def get_current_user_id(request: Request) -> Optional[str]:
    """
    Extract and verify the Clerk user ID from the request.

    Returns the user ID if authenticated, or None if no token provided.
    Does NOT enforce auth — routes can decide whether to require it.
    """
    token = _extract_token(request)
    if not token:
        return None

    try:
        jwks = await _get_clerk_jwks()
        # Decode the JWT header to find the key ID
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        # Find the matching public key
        public_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
                break

        if not public_key:
            return None

        # Verify and decode the token
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )

        return payload.get("sub")  # Clerk user ID

    except (jwt.InvalidTokenError, Exception):
        return None


async def require_auth(request: Request) -> str:
    """
    FastAPI dependency — requires valid Clerk authentication.
    Returns the Clerk user ID or raises 401.
    """
    user_id = await get_current_user_id(request)
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Provide a valid Clerk session token."
        )
    return user_id


async def get_or_create_user(
    user_id: str,
    db: Session,
    email: Optional[str] = None,
) -> User:
    """
    Get existing user or create a new one from Clerk data.
    Called after verifying the Clerk token.
    """
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        user = User(id=user_id, email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
