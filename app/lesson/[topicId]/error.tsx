"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <div className="mb-2 text-red-600">โหลดบทเรียนล้มเหลว</div>
      <pre className="text-xs text-gray-600 whitespace-pre-wrap">{error.message}</pre>
      <button onClick={reset} className="mt-3 rounded-xl border px-3 py-1 hover:bg-gray-50">ลองใหม่</button>
    </div>
  );
}

