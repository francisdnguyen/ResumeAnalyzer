"use client";

import { useAuth } from "@clerk/nextjs";
import { Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ResumeListItem } from "@/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ResumeListProps {
  refreshKey?: number;
  /** Cap the number of rows shown. Displays a "View all" link when the total exceeds this. */
  limit?: number;
  title?: string;
  showUploadLink?: boolean;
}

export function ResumeList({
  refreshKey,
  limit,
  title = "Your Resumes",
  showUploadLink = false,
}: ResumeListProps) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchResumes = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const data = await api.resumes.list(token);
      setResumes(data);
    } catch {
      setError("Failed to load resumes.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes, refreshKey]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated.");
      await api.resumes.delete(id, token);
      setResumes((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch {
      setError("Failed to delete resume. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl animate-pulse">
        <div className="px-6 py-4 border-b border-gray-800">
          <div className="h-4 w-32 bg-gray-800 rounded" />
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between px-6 py-4 border-b border-gray-800 last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="h-5 w-10 bg-gray-800 rounded" />
              <div className="h-4 w-48 bg-gray-800/70 rounded" />
            </div>
            <div className="h-3 w-20 bg-gray-800/50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const visible = limit ? resumes.slice(0, limit) : resumes;
  const hasMore = limit !== undefined && resumes.length > limit;

  if (resumes.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {showUploadLink && (
            <Link
              href="/upload"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              + Upload new
            </Link>
          )}
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm text-gray-500">No resumes uploaded yet.</p>
          <Link
            href="/upload"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg border border-gray-700 transition-colors"
          >
            Upload your first resume →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {showUploadLink && (
          <Link
            href="/upload"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            + Upload new
          </Link>
        )}
      </div>

      {error && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Rows */}
      <ul className="divide-y divide-gray-800">
        {visible.map((resume) => (
          <li
            key={resume.id}
            className="flex items-center justify-between px-6 py-4 gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 uppercase">
                {resume.file_type}
              </span>
              <span className="text-sm text-white truncate">{resume.filename}</span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-gray-600">{formatDate(resume.created_at)}</span>

              {confirmId === resume.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Delete?</span>
                  <button
                    onClick={() => handleDelete(resume.id)}
                    className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded transition-colors font-medium"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(resume.id)}
                  disabled={deletingId === resume.id}
                  className="p-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                  aria-label={`Delete ${resume.filename}`}
                >
                  <Trash2Icon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* View all footer */}
      {hasMore && (
        <div className="px-6 py-3 border-t border-gray-800">
          <Link
            href="/upload"
            className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
          >
            View all {resumes.length} resumes →
          </Link>
        </div>
      )}
    </div>
  );
}
