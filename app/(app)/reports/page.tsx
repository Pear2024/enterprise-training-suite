import { getSession, hasRole } from '@/lib/auth';
import { getReportsOverview, ReportsOverview } from '@/lib/reporting';

const statusLabels: Record<keyof ReportsOverview['summary']['byStatus'], string> = {
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELED: 'Canceled',
};

const numberFormatter = new Intl.NumberFormat('en-US');

export default async function Page() {
  const session = await getSession();
  if (!session) return <main className="p-6">Unauthorized</main>;
  if (!hasRole(session, ['ADMIN', 'TRAINER'])) return <main className="p-6">Forbidden</main>;

  const overview = await getReportsOverview();

  return (
    <main className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Training Reports</h1>
        <p className="text-sm text-gray-600">
          Overview of learner assignments, completions, and recent progress across all topics.
        </p>
      </header>

      <SummaryGrid overview={overview} />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Topic Performance</h2>
        {overview.topics.length === 0 ? (
          <EmptyState message="No assignment or completion data is available yet." />
        ) : (
          <TopicTable overview={overview} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recent Completions</h2>
        {overview.recentCompletions.length === 0 ? (
          <EmptyState message="No completions have been recorded yet." />
        ) : (
          <RecentCompletions overview={overview} />
        )}
      </section>
    </main>
  );
}

function SummaryGrid({ overview }: { overview: ReportsOverview }) {
  const cards = [
    { title: 'Assignments', value: overview.summary.totalAssignments },
    { title: 'Unique Learners', value: overview.summary.uniqueLearners },
    { title: 'Overdue Assignments', value: overview.summary.overdueAssignments },
    { title: 'Topics Tracked', value: overview.summary.topicsTracked },
    {
      title: statusLabels.COMPLETED,
      value: overview.summary.byStatus.COMPLETED,
    },
    {
      title: statusLabels.IN_PROGRESS,
      value: overview.summary.byStatus.IN_PROGRESS,
    },
    {
      title: statusLabels.ASSIGNED,
      value: overview.summary.byStatus.ASSIGNED,
    },
    {
      title: statusLabels.CANCELED,
      value: overview.summary.byStatus.CANCELED,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ title, value }) => (
        <div key={title} className="rounded-xl border bg-white px-4 py-3 shadow-sm">
          <div className="text-sm text-gray-500">{title}</div>
          <div className="mt-1 text-2xl font-semibold">{numberFormatter.format(value)}</div>
        </div>
      ))}
    </div>
  );
}

function TopicTable({ overview }: { overview: ReportsOverview }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-600">Topic</th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
            <th className="px-4 py-2 text-right font-medium text-gray-600">Assignments</th>
            <th className="px-4 py-2 text-right font-medium text-gray-600">Completed</th>
            <th className="px-4 py-2 text-right font-medium text-gray-600">In Progress</th>
            <th className="px-4 py-2 text-right font-medium text-gray-600">Assigned</th>
            <th className="px-4 py-2 text-right font-medium text-gray-600">Completion Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {overview.topics.map((topic) => (
            <tr key={topic.id} className="transition-colors hover:bg-gray-50">
              <td className="px-4 py-2 font-medium text-gray-900">
                <div>{topic.title}</div>
                <div className="text-xs text-gray-500">{topic.code}</div>
              </td>
              <td className="px-4 py-2 text-gray-700">{topic.status}</td>
              <td className="px-4 py-2 text-right">{numberFormatter.format(topic.assignments.total)}</td>
              <td className="px-4 py-2 text-right">
                {numberFormatter.format(topic.assignments.byStatus.COMPLETED)}
              </td>
              <td className="px-4 py-2 text-right">
                {numberFormatter.format(topic.assignments.byStatus.IN_PROGRESS)}
              </td>
              <td className="px-4 py-2 text-right">
                {numberFormatter.format(topic.assignments.byStatus.ASSIGNED)}
              </td>
              <td className="px-4 py-2 text-right">{topic.completionRatePct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentCompletions({ overview }: { overview: ReportsOverview }) {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <ul className="divide-y divide-gray-100 text-sm">
        {overview.recentCompletions.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div>
              <div className="font-medium text-gray-900">{item.userName}</div>
              <div className="text-xs text-gray-500">Completed {item.topicTitle}</div>
            </div>
            <div className="text-xs text-gray-500">{new Date(item.completedAt).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-white px-4 py-6 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}

