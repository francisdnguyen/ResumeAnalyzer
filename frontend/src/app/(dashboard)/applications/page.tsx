"use client";

import { useAuth } from "@clerk/nextjs";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { BriefcaseIcon, GripVerticalIcon, PlusIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  ApplicationResponse,
  ApplicationStatus,
  JobAnalysisResponse,
} from "@/types";

// ─── Column config ─────────────────────────────────────────────────────────────

const COLUMNS: {
  id: ApplicationStatus;
  label: string;
  dot: string;
  headerText: string;
}[] = [
  { id: "applied", label: "Applied", dot: "bg-blue-400", headerText: "text-blue-400" },
  { id: "oa", label: "OA", dot: "bg-purple-400", headerText: "text-purple-400" },
  { id: "interview", label: "Interview", dot: "bg-yellow-400", headerText: "text-yellow-400" },
  { id: "rejected", label: "Rejected", dot: "bg-red-400", headerText: "text-red-400" },
  { id: "offer", label: "Offer", dot: "bg-green-400", headerText: "text-green-400" },
];

// ─── Card content (shared between draggable and overlay) ──────────────────────

function CardContent({ app }: { app: ApplicationResponse }) {
  return (
    <>
      <div className="flex items-start gap-2">
        <GripVerticalIcon className="w-3.5 h-3.5 text-gray-600 shrink-0 mt-0.5 cursor-grab" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">
            {app.job_title ?? "Untitled Role"}
          </p>
          {app.job_company && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{app.job_company}</p>
          )}
        </div>
      </div>
      {app.notes && (
        <p className="text-xs text-gray-600 mt-2 line-clamp-2">{app.notes}</p>
      )}
      <p className="text-xs text-gray-700 mt-2">
        {new Date(app.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </p>
    </>
  );
}

// ─── Draggable card ───────────────────────────────────────────────────────────

function DraggableCard({
  app,
  onDelete,
}: {
  app: ApplicationResponse;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "bg-gray-800 border border-gray-700 rounded-lg p-3 select-none",
        "transition-shadow touch-none relative group",
        isDragging ? "opacity-0" : "hover:border-gray-600 cursor-grab"
      )}
      {...attributes}
      {...listeners}
    >
      <CardContent app={app} />
      {/* Delete button — stopPropagation prevents drag activation */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onDelete(app.id); }}
        className="absolute top-2 right-2 p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
        aria-label="Delete application"
      >
        <XIcon className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Droppable column ─────────────────────────────────────────────────────────

function DroppableColumn({
  col,
  cards,
  onDelete,
}: {
  col: (typeof COLUMNS)[number];
  cards: ApplicationResponse[];
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div className="flex flex-col min-w-[200px] flex-1">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={cn("w-2 h-2 rounded-full shrink-0", col.dot)} />
        <span className={cn("text-xs font-semibold uppercase tracking-wide", col.headerText)}>
          {col.label}
        </span>
        <span className="text-xs text-gray-600 ml-auto">{cards.length}</span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-xl border border-dashed p-2 space-y-2 transition-colors min-h-[120px]",
          isOver
            ? "border-gray-500 bg-gray-800/60"
            : "border-gray-800 bg-gray-900/40"
        )}
      >
        {cards.map((app) => (
          <DraggableCard key={app.id} app={app} onDelete={onDelete} />
        ))}
        {cards.length === 0 && (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-gray-700">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Application Modal ────────────────────────────────────────────────────

function AddApplicationModal({
  jobs,
  onClose,
  onCreated,
}: {
  jobs: JobAnalysisResponse[];
  onClose: () => void;
  onCreated: (app: ApplicationResponse) => void;
}) {
  const { getToken } = useAuth();
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedJobId) return;
    setSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated.");
      const app = await api.applications.create({ job_id: selectedJobId, notes: notes.trim() || undefined }, token);
      onCreated(app);
      setSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create application.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-white">Track Application</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Job picker */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide font-medium mb-1.5">
              Job
            </label>
            {jobs.length === 0 ? (
              <p className="text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2.5">
                No analyzed jobs yet.{" "}
                <a href="/job-analysis" className="underline hover:text-yellow-300">
                  Analyze a job first.
                </a>
              </p>
            ) : (
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full appearance-none bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {[j.title, j.company].filter(Boolean).join(" · ") || "Untitled Job"}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide font-medium mb-1.5">
              Notes <span className="text-gray-700 normal-case">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Recruiter contact, application deadline, etc."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 placeholder-gray-600 resize-none focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 border border-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || jobs.length === 0}
              className={cn(
                "flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
                submitting || jobs.length === 0
                  ? "bg-white/20 text-gray-600 cursor-not-allowed"
                  : "bg-white text-gray-950 hover:bg-gray-100"
              )}
            >
              {submitting ? "Tracking…" : "Track Application"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const { getToken } = useAuth();

  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [jobs, setJobs] = useState<JobAnalysisResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeApp, setActiveApp] = useState<ApplicationResponse | null>(null);
  const [showModal, setShowModal] = useState(false);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const [apps, jobList] = await Promise.all([
          api.applications.list(token),
          api.jobs.list(token),
        ]);
        if (!cancelled) {
          setApplications(apps);
          setJobs(jobList);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load applications.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const app = applications.find((a) => a.id === String(event.active.id));
      setActiveApp(app ?? null);
    },
    [applications]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveApp(null);
      const { active, over } = event;
      if (!over) return;

      const appId = String(active.id);
      const newStatus = String(over.id) as ApplicationStatus;

      const app = applications.find((a) => a.id === appId);
      if (!app || app.status === newStatus) return;

      // Optimistic update
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );

      try {
        const token = await getToken();
        if (!token) throw new Error("Not authenticated.");
        await api.applications.update(appId, { status: newStatus }, token);
      } catch (err) {
        // Revert on failure and surface error to the user
        setApplications((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, status: app.status } : a))
        );
        setError(
          err instanceof Error ? err.message : "Failed to update application status."
        );
      }
    },
    [applications, getToken]
  );

  const handleCreated = useCallback((app: ApplicationResponse) => {
    setApplications((prev) => [app, ...prev]);
    setShowModal(false);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      setApplications((prev) => prev.filter((a) => a.id !== id));
      try {
        const token = await getToken();
        if (!token) throw new Error("Not authenticated.");
        await api.applications.delete(id, token);
      } catch {
        setError("Failed to delete application.");
        // Refetch to restore correct state
        const token = await getToken();
        if (token) {
          const apps = await api.applications.list(token).catch(() => null);
          if (apps) setApplications(apps);
        }
      }
    },
    [getToken]
  );

  const grouped = COLUMNS.reduce<Record<ApplicationStatus, ApplicationResponse[]>>(
    (acc, col) => {
      acc[col.id] = applications.filter((a) => a.status === col.id);
      return acc;
    },
    { applied: [], oa: [], interview: [], rejected: [], offer: [] }
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse mb-8" />
        <div className="flex gap-4">
          {COLUMNS.map((c) => (
            <div key={c.id} className="flex-1 h-64 bg-gray-900 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-w-0 overflow-x-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Applications</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Drag cards to move them between stages.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-gray-950 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Track Application
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Kanban board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveApp(null)}>
        <div className="flex gap-4 items-start min-w-[900px]">
          {COLUMNS.map((col) => (
            <DroppableColumn key={col.id} col={col} cards={grouped[col.id]} onDelete={handleDelete} />
          ))}
        </div>

        <DragOverlay>
          {activeApp && (
            <div className="bg-gray-800 border border-blue-500/40 rounded-lg p-3 shadow-2xl w-48 opacity-95 rotate-1">
              <CardContent app={activeApp} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {applications.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <BriefcaseIcon className="w-8 h-8 text-gray-700" />
          <p className="text-sm text-gray-500">No applications tracked yet.</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg border border-gray-700 transition-colors"
          >
            Track your first application →
          </button>
        </div>
      )}

      {showModal && (
        <AddApplicationModal
          jobs={jobs}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
