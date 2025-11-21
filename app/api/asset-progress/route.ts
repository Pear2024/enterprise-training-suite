export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { AssignmentStatus } from '@prisma/client';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { assignmentId, assetId } = await req.json() as { assignmentId: number; assetId: number };
  if (!assignmentId || !assetId) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // ยืนยันว่า assignment เป็นของ user นี้จริง
  const asg = await prisma.assignment.findFirst({
    where: { id: assignmentId, userId: session.userId },
    select: { id: true },
  });
  if (!asg) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.assetProgress.upsert({
    where: { assignmentId_assetId: { assignmentId, assetId } },
    update: { completedAt: new Date() },
    create: { assignmentId, assetId, completedAt: new Date() },
  });

  await prisma.assignment.updateMany({
    where: {
      id: assignmentId,
      userId: session.userId,
      status: AssignmentStatus.ASSIGNED,
    },
    data: { status: AssignmentStatus.IN_PROGRESS },
  });

  return NextResponse.json({ ok: true });
}
