import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center space-y-10">
        {/* Brand */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium tracking-wide">
            AI-POWERED
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight leading-tight">
            Resume Analyzer
          </h1>
          <p className="text-lg text-gray-400 max-w-md mx-auto leading-relaxed">
            Upload your resume, paste a job description, and get an instant AI match score
            with skill gap analysis and tailored interview questions.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex gap-3 justify-center">
          <Link
            href="/sign-up"
            className="px-5 py-2.5 bg-white text-gray-950 font-semibold rounded-lg hover:bg-gray-100 transition-colors text-sm"
          >
            Get started free
          </Link>
          <Link
            href="/sign-in"
            className="px-5 py-2.5 bg-gray-900 text-gray-300 font-medium rounded-lg hover:bg-gray-800 transition-colors border border-gray-800 text-sm"
          >
            Sign in
          </Link>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
          {[
            {
              title: "AI Match Score",
              desc: "Semantic similarity between your resume and any job description.",
            },
            {
              title: "Skill Gap Analysis",
              desc: "See exactly which skills you're missing for a role.",
            },
            {
              title: "Bullet Rewriter",
              desc: "AI-enhanced bullets that pass recruiter screens.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="p-4 bg-gray-900 rounded-xl border border-gray-800"
            >
              <p className="text-sm font-semibold text-white mb-1">{f.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
