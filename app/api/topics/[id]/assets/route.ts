export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

type Role = 'ADMIN' | 'TRAINER' | 'EMPLOYEE' | undefined;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const topicId = Number(id);
  if (!Number.isFinite(topicId)) {
    return NextResponse.json({ error: 'Invalid topic id' }, { status: 400 });
  }

  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role: Role = session.role as Role;

  // Fetch topic info for display
  const topic = await prisma.trainingTopic.findUnique({
    where: { id: topicId },
    select: { id: true, code: true, title: true },
  });

  // Check assignment; allow preview for ADMIN/TRAINER
  const asg = await prisma.assignment.findFirst({
    where: { userId: session.userId, topicId },
    select: { id: true, assignedAt: true },
  });
  if (!asg && !(role === 'ADMIN' || role === 'TRAINER')) {
    return NextResponse.json({ error: 'No assignment for this topic' }, { status: 404 });
  }

  // Load assets
  const assets = await prisma.trainingAsset.findMany({
    where: { topicId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      type: true,
      title: true,
      url: true,
      htmlContent: true,
      order: true,
      isRequired: true,
      durationSec: true,
      thumbnailUrl: true,
      createdAt: true,
    },
  });

  // Merge progress if assignment exists
  const assetIds = assets.map((a) => a.id);
  const progresses = assetIds.length && asg
    ? await prisma.assetProgress.findMany({
        where: { assignmentId: asg.id, assetId: { in: assetIds } },
        select: { assetId: true, completedAt: true },
      })
    : [];
  const doneSet = new Set(progresses.filter((p) => p.completedAt).map((p) => p.assetId));
  // Question counts per asset (use any to avoid typegen dependency before generate)
  const qs = assetIds.length ? await ((prisma as any).question.findMany({ where: { assetId: { in: assetIds } }, select: { assetId: true } })) : [];
  const qCountMap = new Map<number, number>();
  for (const q of qs as Array<{ assetId: number }>) {
    qCountMap.set(q.assetId, (qCountMap.get(q.assetId) || 0) + 1);
  }

  const items = assets.map((a) => ({
    id: a.id,
    type: a.type,
    title: a.title,
    url: a.url,
    htmlContent: a.htmlContent,
    order: a.order,
    isRequired: a.isRequired,
    durationSec: a.durationSec,
    thumbnailUrl: a.thumbnailUrl,
    completed: doneSet.has(a.id),
    isNew: asg ? a.createdAt > asg.assignedAt : false,
    questionCount: qCountMap.get(a.id) || 0,
  }));

  const newCount = items.filter((i) => i.isNew && !i.completed).length;

  return NextResponse.json({ assignmentId: asg ? asg.id : 0, topic, assets: items, newCount });
}
