-- Week 2 migration — add extracted_skills JSONB to jobs table.
-- Run after 001_initial.sql:
--   psql $DATABASE_URL -f backend/db/migrations/002_add_job_skills.sql

BEGIN;

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS extracted_skills JSONB;

COMMIT;
