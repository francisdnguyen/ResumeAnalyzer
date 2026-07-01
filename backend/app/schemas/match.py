import uuid

from pydantic import BaseModel


class MatchRequest(BaseModel):
    resume_id: uuid.UUID
    job_id: uuid.UUID


class ScoreBreakdown(BaseModel):
    technical_skills: int
    experience_alignment: int
    keywords: int
    preferred_skills: int
    education: int


class MatchResponse(BaseModel):
    resume_id: uuid.UUID
    job_id: uuid.UUID
    overall_score: int
    breakdown: ScoreBreakdown
    strengths: list[str]
    gaps: list[str]
    missing_skills: list[str]
    # Embedding cosine similarity scaled to 0-100; None if either embedding is missing
    semantic_similarity: float | None
