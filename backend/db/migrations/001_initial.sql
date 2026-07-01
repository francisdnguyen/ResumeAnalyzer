-- Run once against your Neon (or local) PostgreSQL database.
-- psql $DATABASE_URL -f backend/db/migrations/001_initial.sql

BEGIN;

-- pgvector must be installed on the server (Neon includes it by default)
CREATE EXTENSION IF NOT EXISTS vector;

-- Users — Clerk user_id is the primary key (string, not UUID)
CREATE TABLE IF NOT EXISTS users (
    id          VARCHAR(255)             PRIMARY KEY,
    email       VARCHAR(255)             UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL     DEFAULT NOW()
);

-- Resumes — raw extracted text + future embedding column
CREATE TABLE IF NOT EXISTS resumes (
    id          UUID        PRIMARY KEY  DEFAULT gen_random_uuid(),
    user_id     VARCHAR(255) NOT NULL    REFERENCES users(id) ON DELETE CASCADE,
    filename    VARCHAR(255) NOT NULL,
    file_type   VARCHAR(10)  NOT NULL,
    raw_text    TEXT         NOT NULL,
    embedding   vector(1536),            -- populated in Week 2 via OpenAI embeddings
    created_at  TIMESTAMPTZ NOT NULL     DEFAULT NOW(),

    CONSTRAINT ck_resumes_file_type CHECK (file_type IN ('pdf', 'docx'))
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id    ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_created_at ON resumes(created_at DESC);
-- IVFFlat vector index — uncomment after first batch of embeddings is loaded:
-- CREATE INDEX ON resumes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Jobs — populated in Week 2
CREATE TABLE IF NOT EXISTS jobs (
    id          UUID        PRIMARY KEY  DEFAULT gen_random_uuid(),
    user_id     VARCHAR(255) NOT NULL    REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255),
    company     VARCHAR(255),
    description TEXT         NOT NULL,
    embedding   vector(1536),
    created_at  TIMESTAMPTZ NOT NULL     DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);

-- Applications — populated in Week 3
CREATE TABLE IF NOT EXISTS applications (
    id          UUID        PRIMARY KEY  DEFAULT gen_random_uuid(),
    user_id     VARCHAR(255) NOT NULL    REFERENCES users(id) ON DELETE CASCADE,
    job_id      UUID                     REFERENCES jobs(id) ON DELETE SET NULL,
    status      VARCHAR(50)  NOT NULL    DEFAULT 'applied',
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL     DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL     DEFAULT NOW(),

    CONSTRAINT ck_applications_status
        CHECK (status IN ('applied', 'oa', 'interview', 'rejected', 'offer'))
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);

COMMIT;
