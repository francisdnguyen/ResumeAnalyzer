from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.routes import applications, bullets, jobs, match, questions, resumes
from app.core.config import settings
from app.core.limiter import limiter
from app.core.logging import RequestContextMiddleware, configure_logging

configure_logging(settings.log_level)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Add startup/shutdown hooks here as needed (e.g., warm JWKS cache)
    yield


app = FastAPI(
    title="Resume Analyzer API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(RequestContextMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://resume-analyzer-two-eta.vercel.app",
        "https://resumeanalyzer-8x0k.onrender.com"
    ],
    # Matches all Vercel preview deploy URLs for this project (anchored, case-insensitive)
    allow_origin_regex=r"(?i)^https://resume-analyzer-[a-z0-9-]+\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resumes.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(match.router, prefix="/api/v1")
app.include_router(applications.router, prefix="/api/v1")
app.include_router(bullets.router, prefix="/api/v1")
app.include_router(questions.router, prefix="/api/v1")


@app.get("/health", tags=["meta"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
