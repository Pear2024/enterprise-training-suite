import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export default async function StartQuiz({ searchParams }: { searchParams: Promise<{ assignmentId?: string; assetId?: string }> }) {
  const session = await getSession();
  if (!session?.userId) redirect('/login');
  const sp = await searchParams;
  const assignmentId = Number(sp.assignmentId);
  const assetId = sp.assetId ? Number(sp.assetId) : NaN;
  if (!Number.isFinite(assignmentId)) redirect('/');

  const asg = await prisma.assignment.findFirst({
    where: { id: assignmentId, userId: session.userId },
    select: { id: true, topicId: true },
  });
  if (!asg) redirect('/');

  if (Number.isFinite(assetId)) {
    const asset = await prisma.trainingAsset.findFirst({ where: { id: Number(assetId), topicId: asg.topicId }, select: { id: true } });
    if (!asset) redirect('/');
    // Allow starting the asset-level quiz without prior completion.
  } else {
    const requiredIds = await prisma.trainingAsset.findMany({
      where: { topicId: asg.topicId, isRequired: true },
      select: { id: true },
    }).then(r => r.map(x => x.id));

    if (requiredIds.length) {
      const done = await prisma.assetProgress.count({
        where: { assignmentId: asg.id, assetId: { in: requiredIds }, completedAt: { not: null } },
      });
      if (done < requiredIds.length) redirect(`/lesson/${asg.topicId}?need=complete-assets`);
    }
  }

  const existing = await prisma.attempt.findFirst({
    where: { assignmentId: asg.id, userId: session.userId, assetId: Number.isFinite(assetId) ? Number(assetId) : null, submittedAt: null },
    orderBy: { startedAt: 'desc' },
    select: { id: true },
  });

  const attempt = existing ?? await prisma.attempt.create({
    data: { assignmentId: asg.id, userId: session.userId, assetId: Number.isFinite(assetId) ? Number(assetId) : null },
    select: { id: true },
  });

  redirect(`/quiz/${attempt.id}`);
}
