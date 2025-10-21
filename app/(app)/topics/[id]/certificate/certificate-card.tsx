"use client";

import { useMemo } from "react";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function CertificateCard({ userName, topicTitle, completedAt }: { userName: string; topicTitle: string; completedAt: string }) {
  const formatted = useMemo(() => formatDate(completedAt), [completedAt]);

  return (
    <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-yellow-400">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="text-sm uppercase tracking-widest text-yellow-600">Certificate of Completion</div>
        <h1 className="text-3xl font-bold text-gray-800">{topicTitle}</h1>
        <div className="text-gray-600">This certifies that</div>
        <div className="text-2xl font-semibold text-gray-900">{userName}</div>
        <div className="text-gray-600">has successfully completed the training topic above.</div>
        <div className="text-gray-500">Completed on {formatted}</div>
        <button onClick={() => window.print()} className="mt-6 rounded-xl border px-4 py-2 hover:bg-gray-50">Print / Save</button>
      </div>
    </div>
  );
}
