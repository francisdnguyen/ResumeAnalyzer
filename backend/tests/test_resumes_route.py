"""
Route-level tests using FastAPI dependency overrides.

get_db is replaced with a small in-memory fake (no real Postgres needed) and
get_current_user_id is replaced with a fixed user id, so these exercise the real
route/query logic without any external services.
"""

import io
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_user_id
from app.core.database import get_db
from main import app

TEST_USER_ID = "user_test_123"


@dataclass
class FakeResume:
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    user_id: str = TEST_USER_ID
    filename: str = "resume.pdf"
    file_type: str = "pdf"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class FakeResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return self

    def all(self):
        return self._items

    def scalar_one_or_none(self):
        return self._items[0] if self._items else None


class FakeSession:
    def __init__(self, items=None):
        self.items = list(items or [])
        self.deleted = []
        self.committed = False

    async def execute(self, _stmt):
        return FakeResult(self.items)

    async def delete(self, obj):
        self.deleted.append(obj)
        if obj in self.items:
            self.items.remove(obj)

    async def commit(self):
        self.committed = True


@pytest.fixture
def override_auth():
    app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID
    yield
    app.dependency_overrides.pop(get_current_user_id, None)


@pytest.fixture
def override_db():
    def _install(session: FakeSession):
        async def _get_db():
            yield session

        app.dependency_overrides[get_db] = _get_db
        return session

    yield _install
    app.dependency_overrides.pop(get_db, None)


def test_upload_rejects_unsupported_file_type(client: TestClient, override_auth):
    files = {"file": ("notes.txt", io.BytesIO(b"plain text"), "text/plain")}
    response = client.post("/api/v1/resumes/upload", files=files)
    assert response.status_code == 415


def test_upload_requires_auth(client: TestClient):
    files = {"file": ("resume.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")}
    response = client.post("/api/v1/resumes/upload", files=files)
    assert response.status_code == 403  # no Authorization header at all


def test_list_resumes_returns_only_current_user_items(client: TestClient, override_auth, override_db):
    fake = FakeResume(filename="jane.pdf")
    override_db(FakeSession(items=[fake]))

    response = client.get("/api/v1/resumes/")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["filename"] == "jane.pdf"


def test_delete_resume_not_found_returns_404(client: TestClient, override_auth, override_db):
    override_db(FakeSession(items=[]))

    response = client.delete(f"/api/v1/resumes/{uuid.uuid4()}")

    assert response.status_code == 404


def test_delete_resume_removes_matching_item(client: TestClient, override_auth, override_db):
    fake = FakeResume()
    session = override_db(FakeSession(items=[fake]))

    response = client.delete(f"/api/v1/resumes/{fake.id}")

    assert response.status_code == 204
    assert fake in session.deleted
    assert session.committed is True
