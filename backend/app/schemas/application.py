from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

ApplicationStatus = Literal["applied", "oa", "interview", "rejected", "offer"]


class ApplicationCreate(BaseModel):
    job_id: UUID
    notes: str | None = None


class ApplicationUpdate(BaseModel):
    status: ApplicationStatus | None = None
    notes: str | None = None


class ApplicationResponse(BaseModel):
    id: UUID
    job_id: UUID | None
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime
    job_title: str | None
    job_company: str | None

    model_config = ConfigDict(from_attributes=True)
