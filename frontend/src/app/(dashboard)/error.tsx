"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-0px)] p-8">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-400 text-lg font-bold">!</span>
        </div>
        <h2 className="text-white font-semibold text-lg mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          An unexpected error occurred loading this page. Your data is safe.
        </p>
        <button
          onClick={reset}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors font-medium"
        >
          Try again
        </button>
        {error.digest && (
          <p className="mt-4 text-xs text-gray-700 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
