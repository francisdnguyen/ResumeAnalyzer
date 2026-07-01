"""
FastAPI dependencies — authentication via Clerk-issued RS256 JWTs.

JWKS is fetched from Clerk on first request, then cached in-process with a 1-hour TTL.
If two concurrent requests arrive before the cache is warm they both fetch — acceptable
for an MVP single-process deployment. Add an asyncio.Lock here if this matters later.
"""

import time

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings

bearer_scheme = HTTPBearer()

_jwks_cache: dict | None = None
_jwks_fetched_at: float = 0.0
_JWKS_TTL = 3600.0  # seconds


async def _get_jwks() -> dict:
    global _jwks_cache, _jwks_fetched_at

    now = time.monotonic()
    if _jwks_cache is not None and (now - _jwks_fetched_at) < _JWKS_TTL:
        return _jwks_cache

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(settings.clerk_jwks_url)
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_fetched_at = now

    return _jwks_cache


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Verify Clerk JWT and return the Clerk user_id (JWT `sub` claim)."""
    token = credentials.credentials
    _unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")

        jwks = await _get_jwks()
        keys = jwks.get("keys", [])

        # Match by kid; fall back to the only key if kid is absent
        matching_key = next((k for k in keys if k.get("kid") == kid), None)
        if matching_key is None:
            if len(keys) == 1:
                matching_key = keys[0]
            else:
                raise _unauthorized

        payload = jwt.decode(
            token,
            matching_key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Clerk omits standard `aud`
        )

        user_id: str | None = payload.get("sub")
        if not user_id:
            raise _unauthorized

        return user_id

    except JWTError:
        raise _unauthorized
    except HTTPException:
        raise
    except Exception:
        raise _unauthorized
