"""
Pytest configuration.

Sets required Settings env vars *before* any `app.*` module is imported, so tests
never touch real Postgres/Clerk/OpenAI credentials — actual process env vars take
priority over the `.env` file that pydantic-settings would otherwise load.
"""

import os

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
os.environ.setdefault("CLERK_SECRET_KEY", "test_secret")
os.environ.setdefault("CLERK_JWKS_URL", "https://example.invalid/.well-known/jwks.json")
os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("LOG_LEVEL", "WARNING")

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
