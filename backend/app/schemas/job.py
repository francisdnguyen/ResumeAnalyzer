import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class JobCreateRequest(BaseModel):
    description: str = Field(..., min_length=50, description="Raw job description text")
    title: str | None = None
    company: str | None = None


class JobAnalysisResponse(BaseModel):
    id: uuid.UUID
    title: str | None
    company: str | None
    description: str
    required_skills: list[str]
    preferred_skills: list[str]
    experience_level: str | None
    education_requirement: str | None
    created_at: datetime
