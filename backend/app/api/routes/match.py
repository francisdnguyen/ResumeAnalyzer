import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.core.limiter import limiter
from app.models.job import Job
from app.models.resume import Resume
from app.schemas.match import MatchRequest, MatchResponse, ScoreBreakdown
from app.services.ai import cosine_similarity, generate_match_analysis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/match", tags=["match"])


@router.post("/", response_model=MatchResponse)
@limiter.limit("10/minute")
async def create_match(
    request: Request,
    body: MatchRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> MatchResponse:
    # Both records must belong to the requesting user — no cross-user data access
    resume_result = await db.execute(
        select(Resume).where(Resume.id == body.resume_id, Resume.user_id == user_id)
    )
    resume = resume_result.scalar_one_or_none()
    if resume is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")

    job_result = await db.execute(
        select(Job).where(Job.id == body.job_id, Job.user_id == user_id)
    )
    job = job_result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    # Cosine similarity — None if either embedding is missing
    sim: float | None = None
    if resume.embedding is not None and job.embedding is not None:
        sim = cosine_similarity(resume.embedding, job.embedding)

    skills = job.extracted_skills or {}
    required_skills: list[str] = skills.get("required_skills") or []
    preferred_skills: list[str] = skills.get("preferred_skills") or []

    try:
        analysis = await generate_match_analysis(
            resume_text=resume.raw_text,
            job_description=job.description,
            required_skills=required_skills,
            preferred_skills=preferred_skills,
        )
    except Exception as exc:
        logger.warning(
            "match analysis failed",
            extra={"user_id": user_id, "resume_id": str(body.resume_id), "job_id": str(body.job_id)},
            exc_info=exc,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service error: {exc}",
        )

    semantic_similarity = round(sim * 100, 1) if sim is not None else None

    logger.info(
        "match computed",
        extra={
            "user_id": user_id,
            "resume_id": str(body.resume_id),
            "job_id": str(body.job_id),
            "overall_score": analysis["overall_score"],
        },
    )

    return MatchResponse(
        resume_id=resume.id,
        job_id=job.id,
        overall_score=analysis["overall_score"],
        breakdown=ScoreBreakdown(**analysis["breakdown"]),
        strengths=analysis["strengths"],
        gaps=analysis["gaps"],
        missing_skills=analysis["missing_skills"],
        semantic_similarity=semantic_similarity,
    )
