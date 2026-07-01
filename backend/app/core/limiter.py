from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def _user_key(request: Request) -> str:
    # Key by the Bearer token so limits are per-user, not per-IP.
    # Behind Vercel's proxy all requests share the same egress IPs,
    # making IP-based limiting useless in production.
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        # First 64 chars of the JWT are unique per session and safe as a key.
        return auth[7:][:64]
    return get_remote_address(request)


limiter = Limiter(key_func=_user_key)
