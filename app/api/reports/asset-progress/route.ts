export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(session.role === 'ADMIN' || session.role === 'TRAINER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const topicId = Number(url.searchParams.get('topicId'));
  if (!Number.isFinite(topicId)) return NextResponse.json({ error: 'Invalid topicId' }, { status: 400 });

  const [topic, assets, assignments] = await Promise.all([
    prisma.trainingTopic.findUnique({ where: { id: topicId }, select: { id: true, code: true, title: true } }),
    prisma.trainingAsset.findMany({
      where: { topicId },
      orderBy: { order: 'asc' },
      select: { id: true, order: true, title: true, isRequired: true },
    }),
    prisma.assignment.findMany({ where: { topicId }, select: { id: true } }),
  ]);
  if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });

  const assignmentIds = assignments.map((a) => a.id);
  const ap = assignmentIds.length && assets.length
    ? await prisma.assetProgress.findMany({
        where: { assignmentId: { in: assignmentIds }, assetId: { in: assets.map((a) => a.id) } },
        select: { assetId: true, completedAt: true },
      })
    : [];

  const perAsset = assets.map((a) => {
    const rows = ap.filter((p) => p.assetId === a.id);
    const passed = rows.filter((r) => r.completedAt).length;
    const total = assignmentIds.length;
    const pct = total ? Math.round((passed / total) * 100) : 0;
    return { id: a.id, order: a.order, title: a.title, isRequired: a.isRequired, passed, total, pct };
  });

  const totals = perAsset.reduce(
    (acc, x) => {
      acc.passed += x.passed;
      acc.total += x.total;
      return acc;
    },
    { passed: 0, total: 0 },
  );

  return NextResponse.json({ topic, perAsset, summary: { passed: totals.passed, total: totals.total } });
}

