# ResumeAnalyzer — AI-Powered Resume & Job Match Platform

## Project Overview

A full-stack SaaS-style AI recruiting assistant where users upload resumes, paste job descriptions, and receive AI-powered match analysis, missing skill detection, resume rewriting, and interview question generation.

**Inspired by:** LinkedIn Premium + TealHQ + Huntr + Resume Copilot  
**Goal:** Feel like a real SaaS product, not a school assignment.

---

## Tech Stack

### Frontend
- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**

### Backend
- **FastAPI** (Python) — primary choice for AI ecosystem fit

### Database
- **PostgreSQL** + **pgvector** extension (for semantic embedding search)
- **Hosted on:** Neon PostgreSQL

### AI / LLM
- **OpenAI API** — GPT-4.1-mini or GPT-4.1
- **Embeddings:** `text-embedding-3-small` stored in pgvector

### Auth
- **Clerk**

### File Uploads
- **UploadThing** (or AWS S3)

### Deployment
- **Frontend:** Vercel
- **Backend:** Render
- **Database:** Neon PostgreSQL

---

## Core Features (Build in this order)

1. **Resume Upload** — PDF/DOCX parsing via `pdfplumber` / `python-docx`
2. **Job Description Analyzer** — extract skills, experience, technologies from pasted JD
3. **AI Match Score** — cosine similarity on embeddings + LLM summary (match %, strengths, gaps)
4. **Missing Skills Detection** — explicit list of skills in JD not found in resume
5. **Resume Bullet Rewriter** — LLM-enhanced bullet points
6. **Interview Question Generator** — behavioral, technical, role-specific questions
7. **Application Tracker** — Kanban: Applied → OA → Interview → Rejected → Offer

---

## Architecture

### Frontend Routes
- `/` — landing/dashboard
- `/upload` — resume upload
- `/job-analysis` — paste & analyze job description
- `/applications` — application tracker
- `/settings` — user settings

### Backend API Routes
```
POST /api/v1/resumes/upload   — resume upload + parsing + embedding
POST /api/v1/jobs/            — job description analysis (skill extraction + embedding)
POST /api/v1/match/           — cosine similarity + weighted match scoring
POST /api/v1/questions/       — interview question generator (Week 3)
POST /api/v1/bullets/         — resume bullet rewriter (Week 3)
GET  /api/v1/applications/    — list applications (Week 3)
POST /api/v1/applications/    — create application (Week 3)
```

### Database Schema
```
Users        — id (Clerk user_id), email, created_at
Resumes      — id, user_id, raw_text, file_type, filename, embedding (vector 1536), created_at
Jobs         — id, user_id, title, company, description, embedding (vector 1536), extracted_skills (jsonb), created_at
Applications — id, user_id, job_id, status, notes, created_at, updated_at
```

### AI Pipeline

**Resume Parsing:**
PDF/DOCX Upload → Extract Text → Clean Text → LLM Skill Extraction → Generate Embeddings → Store in DB

**Job Matching:**
Job Description → Extract Skills → Embedding Comparison → Similarity Score → LLM Summary

**Match Scoring (weighted):**
| Category | Weight |
|---|---|
| Technical skills | 40% |
| Experience alignment | 25% |
| Keywords | 15% |
| Preferred skills | 10% |
| Education | 10% |

---

## UI Design Principles

- Dark mode first
- Dashboard with charts, cards, progress bars
- Aesthetic: Linear / Vercel / Stripe dashboard feel
- Clean, modern, polished — not academic

---

## Advanced Features (Post-MVP only)

- Semantic resume search ("show resumes with React and AWS")
- AI Career Coach (salary insights, roadmap)
- Chrome Extension for analyzing LinkedIn jobs inline
- Real-time email notifications for stale applications

---

## Development Rules

- **Do NOT** train custom ML models or spend time on ML theory
- **Do NOT** overbuild AI — integrate, don't invent
- Focus on: polish, usability, deployment, clean architecture
- Prioritize a live deployed demo above all else

---

## Suggested Build Timeline

| Week | Focus |
|---|---|
| 1 | Stack setup, Auth (Clerk), Database schema, Resume upload |
| 2 | Job description analysis, Match scoring, OpenAI integration |
| 3 | Dashboard UI, Application tracker, Polish |
| 4 | Deployment, README, Architecture diagrams, Resume bullets |

---

## Notes for AI Agents

- Read `AGENTS.md`, `AGENT.md`, and `BRAIN.md` when present — they take precedence over general guidance here.
- Always check existing files before creating new ones.
- Keep the codebase structured as a real SaaS product: proper error handling at system boundaries, typed interfaces, no half-finished stubs.
- Default model for any LLM calls: `gpt-4.1-mini` (cost-effective); escalate to `gpt-4.1` only for complex reasoning tasks.
