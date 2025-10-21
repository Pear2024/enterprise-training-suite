'use client';

import { useRouter } from 'next/navigation';
import type { AssetItem } from '../types';

export default function AssetList({ assignmentId, assets, topicId, canManage }: { assignmentId: number; assets: AssetItem[]; topicId?: number; canManage?: boolean }) {
  const router = useRouter();

  // No manual mark-done; completion happens on quiz pass

  function toEmbedUrl(raw: string): string {
    try {
      const url = new URL(raw);
      if (url.hostname === 'youtu.be') {
        const id = url.pathname.replace('/', '');
        return `https://www.youtube.com/embed/${id}`;
      }
      if (url.hostname.includes('youtube.com')) {
        const id = url.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (url.hostname.includes('drive.google.com')) {
        const m = url.pathname.match(/\/file\/d\/([^/]+)/);
        if (m?.[1]) return `https://drive.google.com/file/d/${m[1]}/preview`;
      }
      return raw;
    } catch {
      return raw;
    }
  }

  return (
    <div className="space-y-4">
      {assets.map((a) => (
        <div key={a.id} className="rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="font-medium">
              {a.order}. {a.title}{' '}
              {a.isRequired && <span className="text-xs text-pink-600">Required</span>}
              {a.isNew && <span className="ml-1 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800 align-middle">New</span>}
              <span className={`ml-2 text-xs ${a.completed ? 'text-green-600' : 'text-gray-500'}`}>{a.completed ? 'Completed' : 'Not completed'}</span>
            </div>
            <div className="flex items-center gap-2">
              {assignmentId > 0 && a.questionCount && a.questionCount > 0 && (
                <a
                  href={`/quiz/start?assignmentId=${assignmentId}&assetId=${a.id}`}
                  className="rounded-xl border px-3 py-1 hover:bg-gray-50"
                >
                  Take quiz for this asset
                </a>
              )}
              {assignmentId <= 0 && canManage && typeof topicId === "number" && (
                <a href={`/topics/${topicId}/edit/assets/${a.id}`} className="rounded border px-3 py-1 text-sm">Manage Questions</a>
              )}
            </div>
          </div>

          <div className="mt-3">
            {a.type === 'VIDEO' && a.url && (
              <div className="aspect-video">
                <iframe
                  src={toEmbedUrl(a.url)}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  loading="lazy"
                  allowFullScreen
                />
              </div>
            )}
            {a.type === 'PDF' && a.url && (
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                Open PDF in new tab
              </a>
            )}
            {a.type === 'IMAGE' && a.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.url} alt={a.title} className="max-w-full rounded-lg" />
            )}
            {a.type === 'LINK' && a.url && (
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                Open link
              </a>
            )}
            {a.type === 'HTML' && a.htmlContent && (
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: a.htmlContent }} />
            )}
          </div>
        </div>
      ))}
      {assignmentId <= 0 && (
        <div className="rounded-xl border p-3 text-sm text-gray-600">
          Preview mode (no assignment){' '}
          {typeof topicId === 'number' && (
            <button
              onClick={async () => {
                const res = await fetch('/api/assignments/self', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ topicId }),
                });
                if (res.ok) router.refresh();
              }}
              className="ml-2 rounded-xl border px-2 py-1 hover:bg-gray-50"
            >
              Assign this topic to me
            </button>
          )}
        </div>
      )}
    </div>
  );
}

