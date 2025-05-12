export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-400 mb-4">Loading Test Inscription...</h1>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-800 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-yellow-600 rounded p-4 bg-gray-900">
              <div className="h-4 bg-gray-800 w-1/3 mb-4"></div>
              <div className="aspect-square bg-gray-800"></div>
            </div>
            <div className="border border-yellow-600 rounded p-4 bg-gray-900">
              <div className="h-4 bg-gray-800 w-1/3 mb-4"></div>
              <div className="h-96 bg-gray-800"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 