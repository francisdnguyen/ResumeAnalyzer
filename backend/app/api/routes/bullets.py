from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.deps import get_current_user_id
from app.core.limiter import limiter
from app.schemas.bullets import BulletRewriteRequest, BulletRewriteResponse
from app.services.ai import rewrite_bullet

router = APIRouter(prefix="/bullets", tags=["bullets"])


@router.post("/", response_model=BulletRewriteResponse)
@limiter.limit("20/minute")
async def rewrite_bullet_endpoint(
    request: Request,
    body: BulletRewriteRequest,
    _user_id: str = Depends(get_current_user_id),
) -> BulletRewriteResponse:
    if not body.bullet.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Bullet point cannot be empty.",
        )
    if len(body.job_description.strip()) < 20:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Job description too short.",
        )

    try:
        rewrites = await rewrite_bullet(body.bullet.strip(), body.job_description)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service error: {exc}",
        )

    return BulletRewriteResponse(rewrites=rewrites)
