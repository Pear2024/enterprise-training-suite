import AssetList from './ui-asset-list';
import type { LessonAssetsResponse } from '../types';
import { headers } from 'next/headers';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

async function getAssets(topicId: string): Promise<LessonAssetsResponse> {
  const h = await headers();
  const explicitBase = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const base = explicitBase || (host ? `${proto}://${host}` : '');
  const cookie = h.get('cookie') ?? '';
  const res = await fetch(`${base}/api/topics/${topicId}/assets`, {
    cache: 'no-store',
    headers: { cookie, accept: 'application/json' },
  });
  if (res.status === 401) redirect(`/login?next=/lesson/${topicId}`);
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : 'Failed to load assets';
    throw new Error(message);
  }
  return data as LessonAssetsResponse;
}

export default async function LessonPage({ params, searchParams }: { params: Promise<{ topicId: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { topicId } = await params;
  const sp = (await (searchParams ?? Promise.resolve({}))) as Record<string, string | string[] | undefined>;
  const { assignmentId, assets, topic } = await getAssets(topicId);
  const session = await getSession();
  const canManage = !!session && session.role !== 'EMPLOYEE';
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">Lesson: {topic?.code ? `${topic.code} - ${topic.title}` : topicId}</h1>
      {sp && sp.need === 'complete-assets' && (
        <div className="mb-4 rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          Please complete all required assets before starting the quiz.
        </div>
      )}
      <AssetList assignmentId={assignmentId} assets={assets} topicId={topic?.id ?? undefined} canManage={canManage} />
    </main>
  );
}

