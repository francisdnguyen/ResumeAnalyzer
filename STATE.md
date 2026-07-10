# STATE.md — Project Topology & Invariant Map

> Phase: **Week 4 — Deploy** | Last updated: 2026-07-01

---

## Component Inventory

| Layer | Technology | Status |
|---|---|---|
| Frontend | Next.js 15 + TypeScript + Tailwind | Complete — all 5 routes live |
| Backend | FastAPI (Python 3.12+) | Complete — 11 routes across 6 modules |
| Database | PostgreSQL + pgvector | 001 + 002 migrated; all 4 tables active |
| Auth | Clerk | Wired and verified |
| File storage | None — in-memory parse only | Intentional |
| AI (LLM) | OpenAI GPT-4.1-mini / GPT-4.1 | Bullets: GPT-4.1 (quality); all others: GPT-4.1-mini |
| Embeddings | OpenAI text-embedding-3-small | Resume upload + job analysis |
| Drag-and-drop | @dnd-kit/core 6.3.1 + @dnd-kit/utilities 3.2.2 | Applications Kanban |
| Rate limiting | slowapi 0.1.9 (in-memory, per Bearer token) | /match, /bullets, /questions |

---

## Frontend Routes

| Route | File | Status |
|---|---|---|
| `/dashboard` | `(dashboard)/dashboard/page.tsx` | Server component — live DB counts + recent resumes |
| `/upload` | `(dashboard)/upload/page.tsx` | PDF/DOCX upload with preview |
| `/job-analysis` | `(dashboard)/job-analysis/page.tsx` | Match score + bullet rewriter + interview questions |
| `/applications` | `(dashboard)/applications/page.tsx` | @dnd-kit Kanban board |
| `/settings` | `(dashboard)/settings/page.tsx` | Clerk UserProfile with dark theme |

---

## State Ownership

| State | Owner | Location | Notes |
|---|---|---|---|
| User identity | Clerk | Clerk cloud | Source of truth |
| User DB record | PostgreSQL | `users` table | Clerk `user_id` is PK |
| Resume extracted text | PostgreSQL | `resumes.raw_text` | Immutable after insert |
| Resume embedding | PostgreSQL (pgvector) | `resumes.embedding` | NULL if OpenAI call failed |
| Job description + embedding | PostgreSQL | `jobs` table | Created via POST /api/v1/jobs |
| Job extracted skills | PostgreSQL (JSONB) | `jobs.extracted_skills` | Stored at creation time |
| Application status | PostgreSQL | `applications.status` | Updated via PATCH /api/v1/applications/:id |
| Match result | Stateless | Computed on POST /api/v1/match | Not persisted |
| Bullet rewrites | Stateless | Computed on POST /api/v1/bullets | Not persisted |
| Interview questions | Stateless | Computed on POST /api/v1/questions | Not persisted |
| Dashboard counts | Derived server-side | dashboard/page.tsx | Fetched at render, cache: no-store |
| Kanban board state | React component | applications/page.tsx | Optimistic updates + PATCH on drag-end |

---

## Data Flow — Resume Upload (end-to-end)

```
1. User selects/drops file (client-side: MIME + size validation)
2. POST /api/v1/resumes/upload  (multipart, Bearer JWT)
3. FastAPI: verify JWT via Clerk JWKS (RS256, kid-matched)
4. FastAPI: read file bytes; validate by magic bytes (%PDF / PK)
5. FastAPI: extract text (pdfplumber for PDF, python-docx for DOCX)
6. FastAPI: clean text (strip control chars, collapse whitespace)
7. DB: upsert users row (Clerk user_id)
8. DB: insert resumes row (raw_text, file_type, filename)
9. Response: { id, filename, file_type, created_at, preview (300 chars) }
10. UI: success state + preview block
```

---

## Security Invariants

- File type identified by **magic bytes**, not MIME header or file extension
- Max upload size: **10 MB** — enforced server-side before parsing
- JWT verified via **Clerk JWKS** — RS256 only; JWKS cached 1 hour in-process
- Filenames **sanitized** (strip non-alphanumeric except `._-`) before storage
- **Raw bytes never persisted** — only extracted text reaches the database
- CORS: `allow_origins` includes localhost + Vercel production domain; `allow_origin_regex` covers all `resume-analyzer-*.vercel.app` preview URLs
- Applications: `application_id` + `job_id` both validated against `user_id` before any read/write
- Pydantic `Literal` type on `ApplicationStatus` — invalid status values rejected at deserialization, before route logic runs
- Bullet rewriter and questions: authenticated but stateless — no user data persisted

---

## API Surface (complete)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Health check |
| POST | `/api/v1/resumes/upload` | Bearer JWT | Parse + store resume + embedding |
| GET | `/api/v1/resumes/` | Bearer JWT | List user's resumes |
| POST | `/api/v1/jobs/` | Bearer JWT | Submit JD → extract skills + embedding → store |
| GET | `/api/v1/jobs/` | Bearer JWT | List user's analyzed jobs |
| DELETE | `/api/v1/jobs/{id}` | Bearer JWT | Delete job (ownership validated) |
| POST | `/api/v1/match/` | Bearer JWT | Cosine sim + GPT weighted match analysis |
| GET | `/api/v1/applications/` | Bearer JWT | List user's applications (batch-joined to jobs) |
| POST | `/api/v1/applications/` | Bearer JWT | Create application (job_id required, ownership validated) |
| PATCH | `/api/v1/applications/{id}` | Bearer JWT | Update status or notes; stamps updated_at explicitly |
| DELETE | `/api/v1/applications/{id}` | Bearer JWT | Delete application (ownership validated) |
| POST | `/api/v1/bullets/` | Bearer JWT | Rewrite resume bullet — GPT-4.1, 3 variants |
| POST | `/api/v1/questions/` | Bearer JWT | Generate interview questions — GPT-4.1-mini, 3 categories |

---

## Database Invariants

- `users.id` = Clerk `user_id` string (NOT a UUID) — Clerk owns identity
- `resumes.file_type` ∈ `{'pdf', 'docx'}` — DB CHECK constraint
- `resumes.embedding` = populated on upload; NULL only if OpenAI call failed
- `applications.status` ∈ `{'applied', 'oa', 'interview', 'rejected', 'offer'}` — DB CHECK + Pydantic Literal
- `applications.job_id` = nullable FK to `jobs(id)` ON DELETE SET NULL
- `applications.updated_at` — explicitly stamped in PATCH route (not relying solely on ORM onupdate)
- All FK relationships cascade on delete (users → resumes/jobs/applications)

---

## Weeks 1–3 — Complete ✓

All features shipped. Post-review fixes applied after 6-agent quality pass:

- `_to_response` demoted from `async` to plain function (was misleadingly async with no I/O)
- `ApplicationStatus` validated via Pydantic `Literal` — removed redundant manual 422 block
- `updated_at` explicitly stamped in PATCH handler
- Drag-end catch now surfaces error to the user (was silently reverting)
- `setSubmitting(false)` added to modal success path
- `clipboard.writeText` rejection is now caught
- `gpt-4.1` escalation in `rewrite_bullet` documented inline (intentional per ROADMAP spec)
- `/settings` page created — was a dead sidebar link

---

## Pending — Week 4

- [x] Next.js `error.tsx` error boundary — `(dashboard)/error.tsx`
- [x] Next.js `loading.tsx` skeleton — `(dashboard)/loading.tsx`
- [x] Rate limiting on AI endpoints — slowapi 0.1.9; 10/min match+questions, 20/min bullets; keyed by Bearer token
- [x] Neon production DB verified — pgvector active, all 4 tables + extracted_skills column present
- [x] CORS updated — Vercel production domain added to `allow_origins`
- [x] Backend live on Render — https://resumeanalyzer-8x0k.onrender.com
- [x] Frontend live on Vercel — https://resume-analyzer-two-eta.vercel.app
- [x] Resume delete — DELETE /api/v1/resumes/{id}, ownership validated, ResumeList shared across dashboard + upload page
- [x] Settings dark theme — Clerk UserProfile using variables API for full dark palette
- [x] README with architecture diagram, local dev instructions, and deploy guide
- [x] Structured JSON logging — `app/core/logging.py`; request-ID middleware on every request, warning-level logs on AI-service failures (previously silent)
- [x] Automated backend tests — pytest suite in `backend/tests/` (31 tests: resume parsing, JWT auth verification, cosine similarity, route-level dependency-override tests); `requirements-dev.txt` + `pyproject.toml` pytest config
