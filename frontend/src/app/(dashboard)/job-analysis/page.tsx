"use client";

import { useAuth } from "@clerk/nextjs";
import {
  AlertCircleIcon,
  BrainCircuitIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  XCircleIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  BulletRewriteResponse,
  InterviewQuestionsResponse,
  JobAnalysisResponse,
  MatchResponse,
  ResumeListItem,
} from "@/types";

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({
  label,
  value,
  weight,
}: {
  label: string;
  value: number;
  weight: string;
}) {
  const color =
    value >= 75
      ? "bg-green-500"
      : value >= 50
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">{label}</span>
          <span className="text-xs text-gray-600">{weight}</span>
        </div>
        <span className="text-sm font-semibold text-white tabular-nums">
          {value}%
        </span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ─── Skill chip ───────────────────────────────────────────────────────────────

function SkillChip({
  skill,
  variant = "neutral",
}: {
  skill: string;
  variant?: "missing" | "required" | "preferred" | "neutral";
}) {
  const styles = {
    missing: "bg-red-500/10 text-red-400 border-red-500/20",
    required: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    preferred: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    neutral: "bg-gray-800 text-gray-300 border-gray-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border",
        styles[variant]
      )}
    >
      {skill}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type PageStatus =
  | "idle"
  | "loading-resumes"
  | "resume-load-error"
  | "analyzing"
  | "success"
  | "error";

export default function JobAnalysisPage() {
  const { getToken } = useAuth();

  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<PageStatus>("loading-resumes");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [job, setJob] = useState<JobAnalysisResponse | null>(null);
  const [match, setMatch] = useState<MatchResponse | null>(null);

  // Bullet rewriter
  const [bulletInput, setBulletInput] = useState("");
  const [bulletRewrites, setBulletRewrites] = useState<BulletRewriteResponse | null>(null);
  const [bulletStatus, setBulletStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [bulletError, setBulletError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Interview questions
  const [questions, setQuestions] = useState<InterviewQuestionsResponse | null>(null);
  const [questionsStatus, setQuestionsStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  // Load resumes on mount for the dropdown
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const list = await api.resumes.list(token);
        if (!cancelled) {
          setResumes(list);
          if (list.length > 0) setSelectedResumeId(list[0].id);
          setStatus("idle");
        }
      } catch {
        if (!cancelled) setStatus("resume-load-error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedResumeId || description.trim().length < 50) return;

    setStatus("analyzing");
    setErrorMessage(null);
    setJob(null);
    setMatch(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated.");

      // Step 1: Submit the job description → extract skills + embedding
      const analyzedJob = await api.jobs.create({ description: description.trim() }, token);
      setJob(analyzedJob);

      // Step 2: Run the match against the selected resume
      const matchResult = await api.match.analyze(
        { resume_id: selectedResumeId, job_id: analyzedJob.id },
        token
      );
      setMatch(matchResult);
      setStatus("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Analysis failed. Please try again."
      );
      setStatus("error");
    }
  }, [selectedResumeId, description, getToken]);

  const reset = () => {
    setDescription("");
    setJob(null);
    setMatch(null);
    setStatus("idle");
    setErrorMessage(null);
    setBulletInput("");
    setBulletRewrites(null);
    setBulletStatus("idle");
    setBulletError(null);
    setCopiedIndex(null);
    setQuestions(null);
    setQuestionsStatus("idle");
    setQuestionsError(null);
  };

  const handleRewriteBullet = useCallback(async () => {
    if (!job || !bulletInput.trim()) return;
    setBulletStatus("loading");
    setBulletError(null);
    setBulletRewrites(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated.");
      const result = await api.bullets.rewrite({
        bullet: bulletInput.trim(),
        job_description: job.description,
      }, token);
      setBulletRewrites(result);
      setBulletStatus("done");
    } catch (err) {
      setBulletError(err instanceof Error ? err.message : "Rewrite failed.");
      setBulletStatus("error");
    }
  }, [job, bulletInput, getToken]);

  const handleCopy = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    }).catch(() => {
      // Clipboard denied (non-HTTPS or permission blocked) — silently skip the visual feedback
    });
  }, []);

  const handleGenerateQuestions = useCallback(async () => {
    if (!job || !selectedResumeId) return;
    setQuestionsStatus("loading");
    setQuestionsError(null);
    setQuestions(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated.");
      const result = await api.questions.generate({
        resume_id: selectedResumeId,
        job_id: job.id,
      }, token);
      setQuestions(result);
      setQuestionsStatus("done");
    } catch (err) {
      setQuestionsError(err instanceof Error ? err.message : "Generation failed.");
      setQuestionsStatus("error");
    }
  }, [job, selectedResumeId, getToken]);

  const scoreColor = (score: number) =>
    score >= 75 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";

  const isReady =
    status !== "loading-resumes" && status !== "analyzing" && status !== "resume-load-error";
  const canSubmit =
    isReady && selectedResumeId !== "" && description.trim().length >= 50;

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Job Analysis</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Paste a job description and see how well your resume matches.
        </p>
      </div>

      {/* Input card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="space-y-5">
          {/* Resume selector */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
              Resume
            </label>
            {status === "loading-resumes" ? (
              <div className="h-10 bg-gray-800 rounded-lg animate-pulse" />
            ) : status === "resume-load-error" ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircleIcon className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-400">
                  Failed to load resumes. Check your connection and{" "}
                  <button onClick={() => window.location.reload()} className="underline hover:text-red-300">
                    refresh the page.
                  </button>
                </p>
              </div>
            ) : resumes.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertCircleIcon className="w-4 h-4 text-yellow-400 shrink-0" />
                <p className="text-sm text-yellow-400">
                  No resumes uploaded yet.{" "}
                  <a href="/upload" className="underline hover:text-yellow-300">
                    Upload one first.
                  </a>
                </p>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  disabled={status === "analyzing"}
                  className={cn(
                    "w-full appearance-none bg-gray-800 border border-gray-700 text-white",
                    "text-sm rounded-lg px-3 py-2.5 pr-9 focus:outline-none focus:border-blue-500",
                    "transition-colors disabled:opacity-50"
                  )}
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.filename} · {r.file_type.toUpperCase()}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Job description textarea */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
              Job Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={status === "analyzing"}
              placeholder="Paste the full job description here…"
              rows={10}
              className={cn(
                "w-full bg-gray-800 border border-gray-700 text-white text-sm",
                "rounded-lg px-4 py-3 placeholder-gray-600 resize-none",
                "focus:outline-none focus:border-blue-500 transition-colors",
                "disabled:opacity-50"
              )}
            />
            <p className="text-xs text-gray-700 mt-1.5">
              {description.trim().length} chars
              {description.trim().length > 0 && description.trim().length < 50 && (
                <span className="text-yellow-600"> — need at least 50</span>
              )}
            </p>
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{errorMessage}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleAnalyze}
              disabled={!canSubmit}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5",
                "text-sm font-semibold rounded-lg transition-colors",
                canSubmit
                  ? "bg-white text-gray-950 hover:bg-gray-100"
                  : "bg-white/20 text-gray-600 cursor-not-allowed"
              )}
            >
              {status === "analyzing" ? (
                <>
                  <BrainCircuitIcon className="w-4 h-4 animate-pulse" />
                  Analyzing…
                </>
              ) : (
                <>
                  <BrainCircuitIcon className="w-4 h-4" />
                  Analyze Match
                </>
              )}
            </button>

            {status === "success" && (
              <button
                onClick={reset}
                className="px-4 py-2.5 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 border border-gray-700 transition-colors"
              >
                New Analysis
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {status === "success" && match && job && (
        <div className="space-y-5">
          {/* Overall score card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                  Match Score
                </p>
                {(job.title || job.company) && (
                  <p className="text-sm text-gray-400 mt-0.5">
                    {[job.title, job.company].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className={cn("text-5xl font-bold tabular-nums", scoreColor(match.overall_score))}>
                  {match.overall_score}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">out of 100</p>
              </div>
            </div>

            {/* Breakdown bars */}
            <div className="space-y-3.5">
              <ScoreBar
                label="Technical Skills"
                value={match.breakdown.technical_skills}
                weight="40%"
              />
              <ScoreBar
                label="Experience Alignment"
                value={match.breakdown.experience_alignment}
                weight="25%"
              />
              <ScoreBar
                label="Keywords"
                value={match.breakdown.keywords}
                weight="15%"
              />
              <ScoreBar
                label="Preferred Skills"
                value={match.breakdown.preferred_skills}
                weight="10%"
              />
              <ScoreBar
                label="Education"
                value={match.breakdown.education}
                weight="10%"
              />
            </div>

            {/* Semantic similarity pill */}
            {match.semantic_similarity !== null && (
              <div className="mt-5 pt-5 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Semantic similarity</p>
                  <span className="text-xs font-medium text-gray-400 tabular-nums">
                    {match.semantic_similarity}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Missing skills */}
          {match.missing_skills.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">
                Missing Skills
              </p>
              <div className="flex flex-wrap gap-2">
                {match.missing_skills.map((s) => (
                  <SkillChip key={s} skill={s} variant="missing" />
                ))}
              </div>
            </div>
          )}

          {/* Strengths & gaps */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">
                Strengths
              </p>
              <ul className="space-y-2.5">
                {match.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <CheckCircle2Icon className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">
                Gaps
              </p>
              <ul className="space-y-2.5">
                {match.gaps.map((g) => (
                  <li key={g} className="flex items-start gap-2">
                    <XCircleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Extracted job details */}
          {(job.required_skills.length > 0 || job.preferred_skills.length > 0) && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-4">
                Extracted Job Requirements
              </p>

              <div className="space-y-4">
                {job.required_skills.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-600 mb-2">Required</p>
                    <div className="flex flex-wrap gap-2">
                      {job.required_skills.map((s) => (
                        <SkillChip key={s} skill={s} variant="required" />
                      ))}
                    </div>
                  </div>
                )}

                {job.preferred_skills.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-600 mb-2">Preferred</p>
                    <div className="flex flex-wrap gap-2">
                      {job.preferred_skills.map((s) => (
                        <SkillChip key={s} skill={s} variant="preferred" />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-6 pt-1">
                  {job.experience_level && (
                    <div>
                      <p className="text-xs text-gray-600">Experience</p>
                      <p className="text-sm text-gray-300 mt-0.5">{job.experience_level}</p>
                    </div>
                  )}
                  {job.education_requirement && (
                    <div>
                      <p className="text-xs text-gray-600">Education</p>
                      <p className="text-sm text-gray-300 mt-0.5">{job.education_requirement}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Bullet Rewriter ───────────────────────────────────────────── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-4">
              Resume Bullet Rewriter
            </p>

            <textarea
              value={bulletInput}
              onChange={(e) => setBulletInput(e.target.value)}
              disabled={bulletStatus === "loading"}
              placeholder="Paste a bullet point from your resume…"
              rows={3}
              className={cn(
                "w-full bg-gray-800 border border-gray-700 text-white text-sm",
                "rounded-lg px-4 py-3 placeholder-gray-600 resize-none",
                "focus:outline-none focus:border-blue-500 transition-colors",
                "disabled:opacity-50 mb-3"
              )}
            />

            <button
              onClick={handleRewriteBullet}
              disabled={bulletStatus === "loading" || !bulletInput.trim()}
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
                bulletStatus === "loading" || !bulletInput.trim()
                  ? "bg-white/20 text-gray-600 cursor-not-allowed"
                  : "bg-white text-gray-950 hover:bg-gray-100"
              )}
            >
              {bulletStatus === "loading" ? "Rewriting…" : "Rewrite Bullet"}
            </button>

            {bulletError && (
              <p className="mt-3 text-sm text-red-400">{bulletError}</p>
            )}

            {bulletRewrites && bulletRewrites.rewrites.length > 0 && (
              <div className="mt-5 space-y-3">
                <p className="text-xs text-gray-600">Choose a rewrite:</p>
                {bulletRewrites.rewrites.map((rewrite, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3"
                  >
                    <p className="text-sm text-gray-300 flex-1">{rewrite}</p>
                    <button
                      onClick={() => handleCopy(rewrite, i)}
                      className="shrink-0 text-xs text-gray-500 hover:text-gray-300 transition-colors pt-0.5"
                    >
                      {copiedIndex === i ? "Copied!" : "Copy"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Interview Questions ───────────────────────────────────────── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                Interview Questions
              </p>
              {questionsStatus !== "done" && (
                <button
                  onClick={handleGenerateQuestions}
                  disabled={questionsStatus === "loading"}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                    questionsStatus === "loading"
                      ? "bg-white/20 text-gray-600 cursor-not-allowed"
                      : "bg-white text-gray-950 hover:bg-gray-100"
                  )}
                >
                  {questionsStatus === "loading" ? "Generating…" : "Generate Questions"}
                </button>
              )}
            </div>

            {questionsStatus === "idle" && (
              <p className="text-sm text-gray-600">
                Generate role-specific behavioral, technical, and situational questions tailored
                to your resume and this job description.
              </p>
            )}

            {questionsError && (
              <p className="text-sm text-red-400">{questionsError}</p>
            )}

            {questions && (
              <div className="space-y-6">
                {[
                  { key: "behavioral" as const, label: "Behavioral", color: "text-blue-400" },
                  { key: "technical" as const, label: "Technical", color: "text-purple-400" },
                  { key: "role_specific" as const, label: "Role-Specific", color: "text-yellow-400" },
                ].map(({ key, label, color }) => (
                  <div key={key}>
                    <p className={cn("text-xs font-semibold uppercase tracking-wide mb-2", color)}>
                      {label}
                    </p>
                    <ul className="space-y-2">
                      {questions[key].map((q, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-gray-700 text-sm shrink-0">{i + 1}.</span>
                          <span className="text-sm text-gray-300">{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
