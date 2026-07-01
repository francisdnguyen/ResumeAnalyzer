# Resume Analyzer

AI-powered resume analysis and job match platform. Upload a resume, paste a job description, get an instant match score with skill gap analysis and tailored interview questions.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python 3.12+) |
| Database | PostgreSQL 15+ + pgvector |
| Auth | Clerk |
| AI (Week 2) | OpenAI API — GPT-4.1-mini + text-embedding-3-small |
| Deploy | Vercel (frontend) · Railway (backend) · Neon (database) |

---

## Local Setup

### Prerequisites
- Node.js 20+
- Python 3.12+
- PostgreSQL 15+ with the `vector` extension, **or** a [Neon](https://neon.tech) account (pgvector included)
- [Clerk](https://clerk.com) account (free tier)

---

### 1. Configure environment variables

**Frontend** — copy and fill in:
```bash
cp frontend/.env.example frontend/.env.local
```
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Backend** — copy and fill in:
```bash
cp backend/.env.example backend/.env
```
```env
DATABASE_URL=postgresql://user:password@localhost:5432/resume_analyzer
CLERK_SECRET_KEY=sk_test_...
CLERK_JWKS_URL=https://<your-clerk-domain>/.well-known/jwks.json
```
> Find your JWKS URL: Clerk Dashboard → API Keys → Advanced → JWKS URL.

---

### 2. Run the database migration

```bash
psql $DATABASE_URL -f backend/db/migrations/001_initial.sql
```

---

### 3. Start the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
ResumeAnalyzer/
├── frontend/                  Next.js 15 app
│   └── src/
│       ├── app/               App Router pages
│       │   ├── (auth)/        Sign-in / sign-up
│       │   └── (dashboard)/   Protected routes
│       ├── components/
│       │   ├── layout/        Sidebar
│       │   └── resume/        ResumeUpload component
│       ├── lib/               api.ts, utils.ts
│       └── types/             Shared TypeScript types
│
├── backend/                   FastAPI application
│   ├── main.py
│   └── app/
│       ├── core/              config.py, database.py
│       ├── models/            SQLAlchemy ORM models
│       ├── schemas/           Pydantic request/response schemas
│       ├── services/          resume_parser.py
│       └── api/
│           ├── deps.py        Clerk JWT verification
│           └── routes/        resumes.py
│
├── db/
│   └── migrations/
│       └── 001_initial.sql    Schema (users, resumes, jobs, applications)
│
├── STATE.md                   Current topology + invariant map
└── ROADMAP.md                 Sprint plan + feature proposals
```

---

## Architecture Notes

- **File type detection** uses magic bytes (`%PDF`, `PK`) — never trusts MIME headers or extensions.
- **Raw bytes are never persisted** — only extracted text reaches PostgreSQL.
- **Clerk user_id** is the primary key for the `users` table — no surrogate UUID.
- **Embeddings** (1536-dim, `text-embedding-3-small`) land in `resumes.embedding` via pgvector — populated in Week 2.
- **JWKS cache** refreshes every hour in-process; update to Redis if you scale to multiple workers.

See `STATE.md` for the full invariant map and `ROADMAP.md` for the sprint plan.
