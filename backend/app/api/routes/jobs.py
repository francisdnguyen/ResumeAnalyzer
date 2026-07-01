import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.models.job import Job
from app.models.resume import User
from app.schemas.job import JobAnalysisResponse, JobCreateRequest
from app.services.ai import analyze_job_description, generate_embedding

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _to_response(job: Job, skills: dict) -> JobAnalysisResponse:
    return JobAnalysisResponse(
        id=job.id,
        title=job.title,
        company=job.company,
        description=job.description,
        required_skills=skills.get("required_skills") or [],
        preferred_skills=skills.get("preferred_skills") or [],
        experience_level=skills.get("experience_level"),
        education_requirement=skills.get("education_requirement"),
        created_at=job.created_at,
    )


@router.post("/", response_model=JobAnalysisResponse, status_code=201)
async def create_job(
    body: JobCreateRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> JobAnalysisResponse:
    # Ensure user row exists
    result = await db.execute(select(User).where(User.id == user_id))
    if result.scalar_one_or_none() is None:
        db.add(User(id=user_id))
        await db.flush()

    # Run skill extraction and embedding generation concurrently
    try:
        extracted, embedding = await asyncio.gather(
            analyze_job_description(body.description),
            generate_embedding(body.description),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service error: {exc}",
        )

    job = Job(
        user_id=user_id,
        # GPT-extracted title/company take precedence over user-supplied hints
        title=extracted.get("title") or body.title,
        company=extracted.get("company") or body.company,
        description=body.description,
        embedding=embedding,
        extracted_skills=extracted,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    return _to_response(job, extracted)


@router.get("/", response_model=list[JobAnalysisResponse])
async def list_jobs(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[JobAnalysisResponse]:
    result = await db.execute(
        select(Job).where(Job.user_id == user_id).order_by(Job.created_at.desc())
    )
    jobs = result.scalars().all()
    return [_to_response(job, job.extracted_skills or {}) for job in jobs]


@router.delete("/{job_id}", status_code=204)
async def delete_job(
    job_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == user_id)
    )
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    await db.delete(job)
    await db.commit()
