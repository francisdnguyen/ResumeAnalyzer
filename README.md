# ResumeAnalyzer

AI-powered resume and job match platform. Upload a resume, paste a job description, and get a weighted match score, missing skill detection, GPT-powered bullet rewrites, and tailored interview questions.

**Live demo:** https://resume-analyzer-two-eta.vercel.app

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (Next.js 16)                  │
│                                                          │
│  /dashboard  /upload  /job-analysis  /applications       │
│  /settings                                               │
│                                                          │
│  Clerk ──► Clerk cloud (JWT issuance + session mgmt)    │
└─────────────────────────┬────────────────────────────────┘
                          │  Bearer JWT  (HTTPS)
                          ▼
┌──────────────────────────────────────────────────────────┐
│                 FastAPI  (Render)                         │
│                                                          │
│  POST  /api/v1/resumes/upload   pdfplumber / python-docx │
│  GET   /api/v1/resumes/                                  │
│  DELETE /api/v1/resumes/{id}                             │
│                                                          │
│  POST  /api/v1/jobs/            GPT-4.1-mini             │
│  GET   /api/v1/jobs/                                     │
│  DELETE /api/v1/jobs/{id}                                │
│                                                          │
│  POST  /api/v1/match/           cosine sim + GPT-4.1-mini│
│  POST  /api/v1/bullets/         GPT-4.1                  │
│  POST  /api/v1/questions/       GPT-4.1-mini             │
│                                                          │
│  GET/POST/PATCH/DELETE /api/v1/applications/             │
│                                                          │
│  Auth:  Clerk JWKS RS256 verification                    │
│  Limits: slowapi — 10 req/min (match, questions)         │
│                    20 req/min (bullets)                  │
└──────────┬──────────────────────────┬────────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────┐   ┌───────────────────────────────┐
│  Neon PostgreSQL    │   │  OpenAI API                   │
│  + pgvector         │   │                               │
│                     │   │  text-embedding-3-small        │
│  users              │   │    resume upload + job submit  │
│  resumes            │   │                               │
│    embedding(1536)  │   │  gpt-4.1-mini (default)       │
│  jobs               │   │    job skill extraction        │
│    embedding(1536)  │   │    match summary               │
│    extracted_skills │   │    interview questions         │
│  applications       │   │                               │
└─────────────────────┘   │  gpt-4.1 (quality escalation) │
                          │    bullet rewrites             │
                          └───────────────────────────────┘
```

### Match scoring weights

| Category | Weight |
|---|---|
| Technical skills | 40% |
| Experience alignment | 25% |
| Keywords | 15% |
| Preferred skills | 10% |
| Education | 10% |

Weighted score is combined with pgvector cosine similarity (embedding distance) for the final percentage.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL + pgvector — Neon |
| Auth | Clerk |
| AI / LLM | OpenAI GPT-4.1-mini / GPT-4.1 |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| Drag-and-drop | @dnd-kit/core |
| Rate limiting | slowapi (in-memory, per Bearer token) |
| Frontend deploy | Vercel |
| Backend deploy | Render |

---

## Local development

### Prerequisites

- Node.js 20+
- Python 3.12+
- A [Neon](https://neon.tech) PostgreSQL database (pgvector included by default)
- A [Clerk](https://clerk.com) application (free tier)
- An [OpenAI](https://platform.openai.com) API key

---

### 1. Clone

```bash
git clone https://github.com/francisdnguyen/ResumeAnalyzer.git
cd ResumeAnalyzer
```

---

### 2. Run database migrations

```bash
psql $DATABASE_URL -f backend/db/migrations/001_initial.sql
psql $DATABASE_URL -f backend/db/migrations/002_add_job_skills.sql
```

`001_initial.sql` creates `users`, `resumes`, `jobs`, and `applications` and enables pgvector.  
`002_add_job_skills.sql` adds `extracted_skills JSONB` to the `jobs` table.

---

### 3. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
CLERK_SECRET_KEY=sk_test_...
CLERK_JWKS_URL=https://your-app.clerk.accounts.dev/.well-known/jwks.json
OPENAI_API_KEY=sk-...
```

> **CLERK_JWKS_URL** — Clerk dashboard → API Keys → Advanced → JWKS URL.

Start the server:

```bash
uvicorn main:app --reload
```

Runs at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

---

### 4. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
```

Runs at `http://localhost:3000`.

---

## Deployment

### Backend → Render

1. Create a new Render Web Service and connect the repo.
2. Set **Root Directory** to `.` and **Dockerfile Path** to `backend/Dockerfile`.
3. Add environment variables in Render:
   ```
   DATABASE_URL
   CLERK_SECRET_KEY
   CLERK_JWKS_URL
   OPENAI_API_KEY
   ```
4. Copy the Render public URL and add it to `allow_origins` in `backend/main.py`.

---

### Frontend → Vercel

1. Import the repo into Vercel. Set the root directory to `frontend/`.
2. Add environment variables in Vercel:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   CLERK_SECRET_KEY
   NEXT_PUBLIC_API_URL    ← your Render backend URL (no trailing slash)
   ```
3. Add your Vercel production domain to Clerk's **Allowed origins**.
4. Deploy. Preview deployments matching `resume-analyzer-*.vercel.app` are covered by `allow_origin_regex` in `backend/main.py` automatically.

---

## Environment variables reference

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon connection string (`postgresql://...`) |
| `CLERK_SECRET_KEY` | Clerk secret key — server-side user lookups |
| `CLERK_JWKS_URL` | Clerk JWKS endpoint — RS256 JWT verification |
| `OPENAI_API_KEY` | OpenAI API key |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key — server components |
| `NEXT_PUBLIC_API_URL` | Backend base URL |

---

## Project structure

```
ResumeAnalyzer/
├── backend/
│   ├── main.py                   FastAPI app, CORS, rate limiting middleware
│   ├── requirements.txt
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py           JWT verification → user_id
│   │   │   └── routes/
│   │   │       ├── resumes.py    upload, list, delete
│   │   │       ├── jobs.py       create, list, delete
│   │   │       ├── match.py      cosine sim + GPT scoring
│   │   │       ├── applications.py  CRUD + kanban status
│   │   │       ├── bullets.py    bullet rewriter
│   │   │       └── questions.py  interview question generator
│   │   ├── core/
│   │   │   ├── config.py         Pydantic settings (reads .env)
│   │   │   ├── database.py       SQLAlchemy async engine (asyncpg)
│   │   │   └── limiter.py        slowapi rate limiter
│   │   ├── models/               SQLAlchemy ORM models
│   │   ├── schemas/              Pydantic request/response schemas
│   │   └── services/
│   │       ├── ai.py             OpenAI calls (embeddings + GPT)
│   │       └── resume_parser.py  PDF/DOCX text extraction
│   └── db/
│       └── migrations/
│           ├── 001_initial.sql   users, resumes, jobs, applications + pgvector
│           └── 002_add_job_skills.sql  extracted_skills JSONB on jobs
│
└── frontend/
    └── src/
        ├── app/
        │   ├── (auth)/           Clerk sign-in / sign-up pages
        │   └── (dashboard)/
        │       ├── dashboard/    Stat cards + recent resumes (server component)
        │       ├── upload/       Resume upload with preview
        │       ├── job-analysis/ Match score, skill chips, bullet rewriter, questions
        │       ├── applications/ @dnd-kit Kanban board
        │       └── settings/     Clerk UserProfile (dark theme)
        ├── components/
        │   └── resume/
        │       └── ResumeList.tsx  Shared resume list with inline delete
        ├── lib/
        │   └── api.ts            Typed fetch wrapper for all API endpoints
        └── types/                Shared TypeScript interfaces
```

---

## Security notes

- File type identified by **magic bytes** (`%PDF`, `PK`) — never trusts the MIME header or extension.
- **Raw bytes are never persisted** — only extracted text reaches the database.
- Max upload size: **10 MB**, enforced server-side before parsing.
- JWT verified against Clerk's **JWKS endpoint** (RS256 only); JWKS is cached 1 hour in-process.
- All resource routes (`/resumes`, `/jobs`, `/applications`) validate `user_id` ownership before any read or write.
- `ApplicationStatus` is a Pydantic `Literal` — invalid values are rejected at deserialization before route logic runs.
