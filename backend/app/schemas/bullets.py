from pydantic import BaseModel


class BulletRewriteRequest(BaseModel):
    bullet: str
    job_description: str


class BulletRewriteResponse(BaseModel):
    rewrites: list[str]
