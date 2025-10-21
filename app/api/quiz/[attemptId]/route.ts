export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(_req: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await ctx.params;
  const id = Number(attemptId);

  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const attempt = await (prisma as any).attempt.findFirst({
    where: { id, userId: session.userId },
    select: { id: true, assignmentId: true, assetId: true, submittedAt: true, assignment: { select: { topicId: true } } },
  });
  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const questions = await (prisma as any).question.findMany({
    where: attempt.assetId ? { assetId: attempt.assetId } : { topicId: attempt.assignment.topicId },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
    select: {
      id: true, text: true, type: true, order: true, points: true,
      choices: { orderBy: { order: 'asc' }, select: { id: true, text: true } },
    },
  });

  const answers = await prisma.attemptAnswer.findMany({
    where: { attemptId: attempt.id },
    select: { questionId: true, choiceId: true, textAnswer: true },
  });

  return NextResponse.json({
    attemptId: attempt.id,
    submitted: !!attempt.submittedAt,
    questions,
    answers,
  });
}

