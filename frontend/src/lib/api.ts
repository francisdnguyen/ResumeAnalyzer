import type {
  ApiError,
  ApplicationCreate,
  ApplicationResponse,
  ApplicationStatus,
  ApplicationUpdate,
  BulletRewriteRequest,
  BulletRewriteResponse,
  InterviewQuestionsRequest,
  InterviewQuestionsResponse,
  JobAnalysisResponse,
  JobCreateRequest,
  MatchRequest,
  MatchResponse,
  ResumeListItem,
  ResumeUploadResponse,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(
  path: string,
  init: RequestInit & { token: string; noBody?: boolean }
): Promise<T> {
  const { token, headers, noBody, ...rest } = init;

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      ...headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch((): ApiError => ({ detail: "Request failed." }));
    throw new Error((body as ApiError).detail ?? "Request failed.");
  }

  if (noBody) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  resumes: {
    upload(file: File, token: string): Promise<ResumeUploadResponse> {
      const formData = new FormData();
      formData.append("file", file);
      return request<ResumeUploadResponse>("/api/v1/resumes/upload", {
        method: "POST",
        token,
        body: formData,
        // Do NOT set Content-Type — browser sets it with the correct multipart boundary
      });
    },

    list(token: string): Promise<ResumeListItem[]> {
      return request<ResumeListItem[]>("/api/v1/resumes/", {
        method: "GET",
        token,
      });
    },

    delete(id: string, token: string): Promise<void> {
      return request<void>(`/api/v1/resumes/${id}`, {
        method: "DELETE",
        token,
        noBody: true,
      });
    },
  },

  jobs: {
    create(body: JobCreateRequest, token: string): Promise<JobAnalysisResponse> {
      return request<JobAnalysisResponse>("/api/v1/jobs/", {
        method: "POST",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },

    list(token: string): Promise<JobAnalysisResponse[]> {
      return request<JobAnalysisResponse[]>("/api/v1/jobs/", {
        method: "GET",
        token,
      });
    },
  },

  match: {
    analyze(body: MatchRequest, token: string): Promise<MatchResponse> {
      return request<MatchResponse>("/api/v1/match/", {
        method: "POST",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
  },

  applications: {
    list(token: string): Promise<ApplicationResponse[]> {
      return request<ApplicationResponse[]>("/api/v1/applications/", {
        method: "GET",
        token,
      });
    },

    create(body: ApplicationCreate, token: string): Promise<ApplicationResponse> {
      return request<ApplicationResponse>("/api/v1/applications/", {
        method: "POST",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },

    update(
      id: string,
      body: ApplicationUpdate,
      token: string,
    ): Promise<ApplicationResponse> {
      return request<ApplicationResponse>(`/api/v1/applications/${id}`, {
        method: "PATCH",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
  },

  bullets: {
    rewrite(body: BulletRewriteRequest, token: string): Promise<BulletRewriteResponse> {
      return request<BulletRewriteResponse>("/api/v1/bullets/", {
        method: "POST",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
  },

  questions: {
    generate(
      body: InterviewQuestionsRequest,
      token: string,
    ): Promise<InterviewQuestionsResponse> {
      return request<InterviewQuestionsResponse>("/api/v1/questions/", {
        method: "POST",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
  },
};

