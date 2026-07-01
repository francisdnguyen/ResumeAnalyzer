from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.models.application import Application
from app.models.job import Job
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationUpdate,
)

router = APIRouter(prefix="/applications", tags=["applications"])


def _to_response(app: Application, job: Job | None) -> ApplicationResponse:
    return ApplicationResponse(
        id=app.id,
        job_id=app.job_id,
        status=app.status,
        notes=app.notes,
        created_at=app.created_at,
        updated_at=app.updated_at,
        job_title=job.title if job else None,
        job_company=job.company if job else None,
    )


@router.get("/", response_model=list[ApplicationResponse])
async def list_applications(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[ApplicationResponse]:
    result = await db.execute(
        select(Application)
        .where(Application.user_id == user_id)
        .order_by(Application.created_at.desc())
    )
    apps = result.scalars().all()

    # Batch-fetch the linked jobs to avoid N+1
    job_ids = {a.job_id for a in apps if a.job_id is not None}
    jobs_by_id: dict[UUID, Job] = {}
    if job_ids:
        jobs_result = await db.execute(
            select(Job).where(Job.id.in_(job_ids), Job.user_id == user_id)
        )
        jobs_by_id = {j.id: j for j in jobs_result.scalars().all()}

    return [_to_response(a, jobs_by_id.get(a.job_id)) for a in apps]


@router.post("/", response_model=ApplicationResponse, status_code=201)
async def create_application(
    body: ApplicationCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ApplicationResponse:
    # Validate the job belongs to this user
    job_result = await db.execute(
        select(Job).where(Job.id == body.job_id, Job.user_id == user_id)
    )
    job = job_result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    app = Application(
        user_id=user_id,
        job_id=body.job_id,
        status="applied",
        notes=body.notes,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)

    return _to_response(app, job)


@router.patch("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: UUID,
    body: ApplicationUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ApplicationResponse:
    result = await db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.user_id == user_id,
        )
    )
    app = result.scalar_one_or_none()
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if body.status is not None:
        app.status = body.status  # Pydantic Literal validates the value before this runs

    if body.notes is not None:
        app.notes = body.notes

    # Explicitly stamp updated_at so ORM-level onupdate and DB-level timestamps stay in sync
    app.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(app)

    job: Job | None = None
    if app.job_id is not None:
        job_result = await db.execute(
            select(Job).where(Job.id == app.job_id, Job.user_id == user_id)
        )
        job = job_result.scalar_one_or_none()

    return _to_response(app, job)
