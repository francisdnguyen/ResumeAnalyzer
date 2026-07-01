from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.models.resume import Resume, User
from app.schemas.resume import ResumeListItem, ResumeUploadResponse
from app.services.ai import generate_embedding
from app.services.resume_parser import parse_resume

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("/upload", response_model=ResumeUploadResponse, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ResumeUploadResponse:
    raw_text, file_type, safe_filename = await parse_resume(file)

    # Generate embedding before committing — NULL on failure, upload still succeeds
    embedding = await generate_embedding(raw_text)

    # Upsert the user row — Clerk is the source of truth for identity
    result = await db.execute(select(User).where(User.id == user_id))
    if result.scalar_one_or_none() is None:
        db.add(User(id=user_id))
        await db.flush()

    resume = Resume(
        user_id=user_id,
        filename=safe_filename,
        file_type=file_type,
        raw_text=raw_text,
        embedding=embedding,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)

    return ResumeUploadResponse(
        id=resume.id,
        filename=resume.filename,
        file_type=resume.file_type,
        created_at=resume.created_at,
        preview=raw_text[:300],
        embedding_ready=embedding is not None,
    )


@router.get("/", response_model=list[ResumeListItem])
async def list_resumes(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[ResumeListItem]:
    result = await db.execute(
        select(Resume)
        .where(Resume.user_id == user_id)
        .order_by(Resume.created_at.desc())
    )
    return list(result.scalars().all())
