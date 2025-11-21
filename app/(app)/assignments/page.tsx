import { AssignmentStatus } from '@prisma/client';

import { getAssignmentSummary } from '@/lib/assignment-metrics';
import { getSession } from '@/lib/auth';
import AssignClient from './assign-client';

const numberFormatter = new Intl.NumberFormat('en-US');

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string>> }) {
  const session = await getSession();
  if (!session) return <main className="p-6">Unauthorized</main>;
  if (session.role === 'EMPLOYEE') return <main className="p-6">Forbidden</main>;

  const sp = (await searchParams) ?? {};
  const saved = sp.saved === '1';
  const count = Number(sp.count || 0) || undefined;
  const summary = await getAssignmentSummary();

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

      <AssignmentOverview summary={summary} />

      <AssignClient />
    </main>
  );
}

type AssignmentOverviewProps = {
  summary: Awaited<ReturnType<typeof getAssignmentSummary>>;
};

function AssignmentOverview({ summary }: AssignmentOverviewProps) {
  const notStarted = summary.byStatus[AssignmentStatus.ASSIGNED] ?? 0;
  const inProgress = summary.byStatus[AssignmentStatus.IN_PROGRESS] ?? 0;
  const completed = summary.byStatus[AssignmentStatus.COMPLETED] ?? 0;

  const cards = [
    { title: 'Total assignments', value: summary.total },
    { title: 'Completed', value: completed },
    { title: 'In progress', value: inProgress },
    { title: 'Not started', value: notStarted },
    { title: 'Overdue', value: summary.overdue },
  ];

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-lg font-semibold">Overview</h2>
        <p className="text-sm text-muted-foreground">
          Track how many assignments have been sent out and how learners are progressing.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.title} className="rounded-xl border bg-white px-4 py-3 shadow-sm">
            <div className="text-sm text-muted-foreground">{card.title}</div>
            <div className="mt-1 text-2xl font-semibold">{numberFormatter.format(card.value)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
