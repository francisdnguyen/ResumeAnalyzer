import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.core.limiter import limiter
from app.models.job import Job
from app.models.resume import Resume
from app.schemas.questions import InterviewQuestionsRequest, InterviewQuestionsResponse
from app.services.ai import generate_interview_questions

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/questions", tags=["questions"])


@router.post("/", response_model=InterviewQuestionsResponse)
@limiter.limit("10/minute")
async def generate_questions(
    request: Request,
    body: InterviewQuestionsRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> InterviewQuestionsResponse:
    # Both records must belong to the requesting user
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

    try:
        result = await generate_interview_questions(
            resume_text=resume.raw_text,
            job_description=job.description,
            job_title=job.title,
        )
    except Exception as exc:
        logger.warning(
            "interview question generation failed",
            extra={"user_id": user_id, "resume_id": str(body.resume_id), "job_id": str(body.job_id)},
            exc_info=exc,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service error: {exc}",
        )

    return InterviewQuestionsResponse(**result)
