import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

type RawAssignment = {
  id: number;
  status: string;
  topicId: number;
  topic: { id: number; code: string; title: string };
};

type DashboardAssignment = {
  id: number;
  status: string;
  topicId: number;
  topic: { code: string; title: string };
  required: number;
  done: number;
  pct: number;
  assets: { id: number; order: number; title: string; isRequired: boolean; passed: boolean }[];
  completedAt: Date | null;
};

const ROLE_INFO: Record<string, { title: string; bullets: string[]; note: string }> = {
  ADMIN: {
    title: "Administrator",
    bullets: [
      "Create, edit and retire training topics.",
      "Configure assets, quizzes and per-asset questions.",
      "Assign trainings to employees and trainers in bulk.",
      "Review system-wide reports and completion metrics.",
      "Manage platform settings from the Admin area.",
    ],
    note: "Use the navigation on the left to jump into each area.",
  },
  TRAINER: {
    title: "Trainer",
    bullets: [
      "Maintain training topics, assets and quizzes for your team.",
      "Assign trainings to learners and monitor completion progress.",
      "Review quiz results and completions in the Reports section.",
    ],
    note: "Need platform-wide settings? Contact an administrator.",
  },
};

export default async function Page() {
  const session = await getSession();
  if (!session) return <main className="p-6">Unauthorized</main>;

  if (session.role !== "EMPLOYEE") {
    const info = ROLE_INFO[session.role] ?? {
      title: session.role,
      bullets: ["Explore the navigation menu to access available tools."],
      note: "",
    };

    return (
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-bold mb-3">Welcome, {session.username}</h1>
        <RoleInfo title={info.title} bullets={info.bullets} note={info.note} />
      </main>
    );
  }

  const rawAssignments: RawAssignment[] = await prisma.assignment.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      topicId: true,
      topic: { select: { id: true, code: true, title: true } },
    },
  });

  const items: DashboardAssignment[] = await Promise.all(
    rawAssignments.map(async (assignment) => {
      const assets = await prisma.trainingAsset.findMany({
        where: { topicId: assignment.topicId },
        orderBy: { order: "asc" },
        select: { id: true, order: true, title: true, isRequired: true },
      });
      const progress = assets.length
        ? await prisma.assetProgress.findMany({
            where: { assignmentId: assignment.id, assetId: { in: assets.map((x) => x.id) } },
            select: { assetId: true, completedAt: true },
          })
        : [];
      const doneSet = new Set(progress.filter((p) => p.completedAt).map((p) => p.assetId));
      const reqTotal = assets.filter((x) => x.isRequired).length;
      const reqDone = assets.filter((x) => x.isRequired && doneSet.has(x.id)).length;
      const pct = reqTotal ? Math.round((reqDone / reqTotal) * 100) : 100;
      const assetRows = assets.map((x) => ({
        id: x.id,
        order: x.order,
        title: x.title,
        isRequired: x.isRequired,
        passed: doneSet.has(x.id),
      }));
      const completion = await prisma.completion.findUnique({
        where: { uniq_completion_per_topic: { userId: session.userId, topicId: assignment.topicId } },
        select: { completedAt: true },
      });
      return {
        id: assignment.id,
        status: assignment.status,
        topicId: assignment.topicId,
        topic: { code: assignment.topic.code, title: assignment.topic.title },
        required: reqTotal,
        done: reqDone,
        pct,
        assets: assetRows,
        completedAt: completion?.completedAt ?? null,
      };
    })
  );

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">My Assignments</h1>
      <p className="text-sm text-gray-600">
        Complete every required asset and pass its quiz. When you finish a topic you can download the certificate.
      </p>
      {items.length === 0 && <div className="text-sm text-gray-600">No assignments yet.</div>}
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">
                {it.topic.code} - {it.topic.title}
              </div>
              <div className="flex gap-2">
                <Link href={`/lesson/${it.topicId}`} className="rounded-xl border px-3 py-1 hover:bg-gray-50">
                  Open Lesson
                </Link>
                {it.completedAt && (
                  <Link href={`/topics/${it.topicId}/certificate`} className="rounded-xl border px-3 py-1 hover:bg-gray-50">
                    View Certificate
                  </Link>
                )}
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">Status: {it.status}</div>
            <div className="mt-2">
              <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
                <div className="h-2 bg-green-500" style={{ width: `${it.pct}%` }} />
              </div>
              <div className="mt-1 text-xs text-gray-600">
                {it.done}/{it.required} required completed ({it.pct}%)
                {it.completedAt ? ` - completed on ${it.completedAt.toLocaleDateString()}` : ''}
              </div>
            </div>
            <div className="mt-3 text-sm">
              <div className="font-medium mb-1">Asset Quiz Summary</div>
              <ul className="list-disc pl-5 space-y-0.5">
                {it.assets?.map((a) => (
                  <li key={a.id}>
                    #{a.order} {a.title}{" "}
                    <span className={a.passed ? "text-green-600" : "text-gray-500"}>
                      {a.passed ? "Passed" : "Not passed"}
                    </span>
                    {a.isRequired && <span className="ml-2 text-xs text-pink-600">Must do</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function RoleInfo({ title, bullets, note }: { title: string; bullets: string[]; note: string }) {
  return (
    <div className="space-y-2 text-sm text-gray-700">
      <p>
        As a <strong>{title}</strong>, you can:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        {bullets.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      {note && <p>{note}</p>}
    </div>
  );
}

