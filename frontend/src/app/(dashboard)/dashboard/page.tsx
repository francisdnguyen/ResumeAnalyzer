import { auth, currentUser } from "@clerk/nextjs/server";
import { ResumeList } from "@/components/resume/ResumeList";

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

  const resumeCount: number =
    resumesRes.status === "fulfilled" && resumesRes.value.ok
      ? ((await resumesRes.value.json()) as { id: string }[]).length
      : 0;

  const jobCount: number =
    jobsRes.status === "fulfilled" && jobsRes.value.ok
      ? ((await jobsRes.value.json()) as JobItem[]).length
      : 0;

  const appCount: number =
    appsRes.status === "fulfilled" && appsRes.value.ok
      ? ((await appsRes.value.json()) as unknown[]).length
      : 0;

  return { resumeCount, jobCount, appCount };
}

export default async function DashboardPage() {
  const [user, authResult] = await Promise.all([currentUser(), auth()]);
  const firstName = user?.firstName ?? null;
  const token = await authResult.getToken();

  const { resumeCount, jobCount, appCount } = token
    ? await fetchDashboardData(token)
    : { resumeCount: 0, jobCount: 0, appCount: 0 };

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
          { label: "Resumes", value: resumeCount, sub: "uploaded" },
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

      {/* Recent resumes — client component handles fetch + delete */}
      <ResumeList limit={3} title="Recent Resumes" showUploadLink />
    </div>
  );
}
