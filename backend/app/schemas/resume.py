import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ResumeUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    file_type: str
    created_at: datetime
    preview: str  # First 300 chars of extracted text — for immediate UI feedback
    embedding_ready: bool  # False if OpenAI call failed; match endpoint handles gracefully


class ResumeListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    file_type: str
    created_at: datetime
