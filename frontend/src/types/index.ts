// Mirror the backend Pydantic response schemas — keep in sync with app/schemas/resume.py

export interface ResumeListItem {
  id: string;
  filename: string;
  file_type: "pdf" | "docx";
  created_at: string;
}

// --- Jobs ---

export interface JobCreateRequest {
  description: string;
  title?: string;
  company?: string;
}

export interface JobAnalysisResponse {
  id: string;
  title: string | null;
  company: string | null;
  description: string;
  required_skills: string[];
  preferred_skills: string[];
  experience_level: string | null;
  education_requirement: string | null;
  created_at: string;
}

// --- Match ---

export interface MatchRequest {
  resume_id: string;
  job_id: string;
}

export interface ScoreBreakdown {
  technical_skills: number;
  experience_alignment: number;
  keywords: number;
  preferred_skills: number;
  education: number;
}

export interface MatchResponse {
  resume_id: string;
  job_id: string;
  overall_score: number;
  breakdown: ScoreBreakdown;
  strengths: string[];
  gaps: string[];
  missing_skills: string[];
  /** Embedding cosine similarity scaled 0-100; null if either embedding is missing */
  semantic_similarity: number | null;
}

// --- Resume (updated) ---

export interface ResumeUploadResponse {
  id: string;
  filename: string;
  file_type: "pdf" | "docx";
  created_at: string;
  preview: string;
  embedding_ready: boolean;
}

export interface ApiError {
  detail: string;
}

// --- Applications ---

export type ApplicationStatus =
  | "applied"
  | "oa"
  | "interview"
  | "rejected"
  | "offer";

export interface ApplicationCreate {
  job_id: string;
  notes?: string;
}

export interface ApplicationUpdate {
  status?: ApplicationStatus;
  notes?: string;
}

export interface ApplicationResponse {
  id: string;
  job_id: string | null;
  status: ApplicationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  job_title: string | null;
  job_company: string | null;
}

// --- Bullets ---

export interface BulletRewriteRequest {
  bullet: string;
  job_description: string;
}

export interface BulletRewriteResponse {
  rewrites: string[];
}

// --- Interview Questions ---

export interface InterviewQuestionsRequest {
  resume_id: string;
  job_id: string;
}

export interface InterviewQuestionsResponse {
  behavioral: string[];
  technical: string[];
  role_specific: string[];
}
