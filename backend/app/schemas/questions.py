from uuid import UUID

from pydantic import BaseModel


class InterviewQuestionsRequest(BaseModel):
    resume_id: UUID
    job_id: UUID


class InterviewQuestionsResponse(BaseModel):
    behavioral: list[str]
    technical: list[str]
    role_specific: list[str]
