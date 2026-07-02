# ROADMAP.md

## Week 1 — Foundation
- [x] Next.js 15 + FastAPI project scaffold
- [x] Clerk authentication (middleware, sign-in/sign-up, protected routes)
- [x] PostgreSQL + pgvector schema (users, resumes, jobs, applications)
- [x] Resume upload pipeline — PDF/DOCX parsing, magic byte validation, text extraction
- [x] Dashboard UI — sidebar nav, stat cards, upload page

## Week 2 — AI Core
- [x] OpenAI `text-embedding-3-small` on every resume upload
- [x] POST `/api/v1/jobs/` — paste job description, extract skills via GPT-4.1-mini
- [x] POST `/api/v1/match/` — cosine similarity + weighted scoring (skills 40%, experience 25%, keywords 15%, preferred 10%, education 10%)
- [x] Missing skills detection — diff job skills vs resume skills
- [x] Job analysis page UI — resume dropdown, JD textarea, score breakdown, strengths/gaps, skill chips

## Week 3 — Product Polish
- [x] Resume bullet rewriter (GPT-4.1) — POST /api/v1/bullets/, 3 rewrites with copy buttons
- [x] Interview question generator (behavioral + technical + role-specific) — POST /api/v1/questions/
- [x] Application tracker — Kanban UI (Applied → OA → Interview → Rejected → Offer) + backend CRUD
- [x] Dashboard stat cards wired to real DB counts (resumes, jobs, applications)
- [x] Recent resumes list on dashboard (live data, server-side auth)
- [x] /settings page — Clerk UserProfile with dark theme
- [x] 6-agent quality review pass — 8 bugs fixed post-review

## Week 4 — Ship
- [x] CORS: add Vercel production domain to `allow_origins` in `backend/main.py`
- [x] Backend deploy to Railway — https://resumeanalyzer-production-de80.up.railway.app
- [x] Frontend deploy to Vercel — https://resume-analyzer-two-eta.vercel.app
- [x] Verify Neon migrations 001 + 002 applied to production DB
- [x] Rate limiting on AI-heavy endpoints (`/match`, `/bullets`, `/questions`)
- [x] Next.js `error.tsx` + `loading.tsx` for dashboard route group
- [x] Resume delete — DELETE /api/v1/resumes/{id} + ResumeList on dashboard + upload page
- [x] Settings dark theme — Clerk variables API applied to UserProfile
- [x] README — architecture diagram, local dev setup, deploy guide

---

## Feature Proposals

> Surfaced during implementation — not scheduled. Raise any to move into a sprint.

### [PROPOSAL-001] Resume Version History
**Signal:** Users will iterate on their resume after seeing bullet rewrites. Tracking versions (before/after) turns the rewriter from a one-shot tool into an audit trail — a compelling demo moment.
**Effort:** Low — add `parent_id UUID REFERENCES resumes(id)` and `version INT DEFAULT 1`.

### [PROPOSAL-002] Job Description URL Import
**Signal:** The friction of copy-pasting from LinkedIn is real. A URL field that fetches + strips HTML → feeds to GPT for clean extraction removes the most common complaint about resume tools.
**Effort:** Medium — needs a scraper service; LinkedIn blocks headless browsers, plan for a user-agent fallback.

### [PROPOSAL-003] Match Score History Chart
**Signal:** Users comparing multiple job listings want to see which roles fit best over time. A sparkline per job on the dashboard makes this feel like a real analytics product.
**Effort:** Low — store match results in a `matches` table, render with `recharts`.
