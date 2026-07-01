export default function Loading() {
  return (
    <div className="p-8 max-w-5xl animate-pulse">
      <div className="h-7 w-48 bg-gray-800 rounded-md mb-2" />
      <div className="h-4 w-64 bg-gray-800/60 rounded-md mb-8" />
      <div className="bg-gray-900 border border-gray-800 rounded-xl h-64" />
    </div>
  );
}
