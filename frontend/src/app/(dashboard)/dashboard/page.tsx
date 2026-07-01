import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";

interface ResumeListItem {
  id: string;
  filename: string;
  file_type: "pdf" | "docx";
  created_at: string;
}

interface JobItem {
  id: string;
}

async function fetchDashboardData(token: string) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const headers = { Authorization: `Bearer ${token}` };

  const [resumesRes, jobsRes, appsRes] = await Promise.allSettled([
    fetch(`${base}/api/v1/resumes/`, { headers, cache: "no-store" }),
    fetch(`${base}/api/v1/jobs/`, { headers, cache: "no-store" }),
    fetch(`${base}/api/v1/applications/`, { headers, cache: "no-store" }),
  ]);

  const resumes: ResumeListItem[] =
    resumesRes.status === "fulfilled" && resumesRes.value.ok
      ? await resumesRes.value.json()
      : [];

  const jobCount: number =
    jobsRes.status === "fulfilled" && jobsRes.value.ok
      ? ((await jobsRes.value.json()) as JobItem[]).length
      : 0;

  const appCount: number =
    appsRes.status === "fulfilled" && appsRes.value.ok
      ? ((await appsRes.value.json()) as unknown[]).length
      : 0;

  return { resumes, jobCount, appCount };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const [user, authResult] = await Promise.all([currentUser(), auth()]);
  const firstName = user?.firstName ?? null;
  const token = await authResult.getToken();

  const { resumes, jobCount, appCount } = token
    ? await fetchDashboardData(token)
    : { resumes: [], jobCount: 0, appCount: 0 };

  const recentResumes = resumes.slice(0, 3);

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Your recruiting intelligence dashboard.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Resumes", value: resumes.length, sub: "uploaded" },
          { label: "Jobs Analyzed", value: jobCount, sub: "in your library" },
          { label: "Applications", value: appCount, sub: "tracked" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              {stat.label}
            </p>
            <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
            <p className="text-xs text-gray-600 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent resumes */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Recent Resumes</h2>
          <Link
            href="/upload"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            + Upload new
          </Link>
        </div>

        {recentResumes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-gray-500">No resumes uploaded yet.</p>
            <Link
              href="/upload"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg border border-gray-700 transition-colors"
            >
              Upload your first resume →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {recentResumes.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 uppercase">
                    {r.file_type}
                  </span>
                  <span className="text-sm text-white truncate">{r.filename}</span>
                </div>
                <span className="text-xs text-gray-600 shrink-0 ml-4">
                  {formatDate(r.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {resumes.length > 3 && (
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
    </div>
  );
}
