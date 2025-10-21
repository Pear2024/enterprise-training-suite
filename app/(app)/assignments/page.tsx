import { getSession } from '@/lib/auth';
import AssignClient from './assign-client';

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string>> }) {
  const session = await getSession();
  if (!session) return <main className="p-6">Unauthorized</main>;
  if (session.role === 'EMPLOYEE') return <main className="p-6">Forbidden</main>;

  const sp = (await searchParams) ?? {};
  const saved = sp.saved === '1';
  const count = Number(sp.count || 0) || undefined;

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assignments</h1>
      </div>

      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 text-green-800 px-4 py-2">
          Assigned successfully{count ? ` (${count})` : ''}
        </div>
      )}

      <AssignClient />
    </main>
  );
}
