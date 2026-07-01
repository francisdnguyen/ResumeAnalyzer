export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-5xl animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-7 w-56 bg-gray-800 rounded-md mb-2" />
        <div className="h-4 w-72 bg-gray-800/60 rounded-md" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6"
          >
            <div className="h-3 w-20 bg-gray-800 rounded mb-3" />
            <div className="h-9 w-12 bg-gray-800 rounded mb-2" />
            <div className="h-3 w-24 bg-gray-800/60 rounded" />
          </div>
        ))}
      </div>

      {/* Content card skeleton */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="h-4 w-32 bg-gray-800 rounded" />
          <div className="h-4 w-20 bg-gray-800/60 rounded" />
        </div>
        <div className="divide-y divide-gray-800">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-5 w-10 bg-gray-800 rounded" />
                <div className="h-4 w-48 bg-gray-800/70 rounded" />
              </div>
              <div className="h-3 w-20 bg-gray-800/50 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
