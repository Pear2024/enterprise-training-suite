export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

type IncomingAnswer = {
  questionId: number;
  choiceIds?: number[];
  textAnswer?: string | null;
};

type Incoming = {
  answers: IncomingAnswer[];
};

export async function POST(req: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { attemptId } = await ctx.params;
  const id = Number(attemptId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid attempt id' }, { status: 400 });
  }

  const attempt = await (prisma as any).attempt.findFirst({
    where: { id, userId: session.userId },
    select: {
      id: true,
      assignmentId: true,
      assetId: true,
      submittedAt: true,
      assignment: { select: { topicId: true } },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (attempt.submittedAt) {
    return NextResponse.json({ error: 'Already submitted' }, { status: 400 });
  }

  let body: Incoming | null = null;
  try {
    body = (await req.json()) as Incoming;
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (!body || !Array.isArray(body.answers)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const map = new Map<number, { choiceIds: number[]; textAnswer: string | null }>();
  for (const raw of body.answers) {
    if (!raw || !Number.isFinite(raw.questionId)) continue;
    const choiceIds = Array.isArray(raw.choiceIds) ? raw.choiceIds.filter((n) => Number.isFinite(n)) : [];
    const textAnswer = raw.textAnswer ?? null;
    map.set(raw.questionId, { choiceIds: Array.from(new Set(choiceIds)) as number[], textAnswer });
  }

  const questions = await (prisma as any).question.findMany({
    where: attempt.assetId ? { assetId: attempt.assetId } : { topicId: attempt.assignment.topicId },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      type: true,
      points: true,
      choices: { select: { id: true, isCorrect: true } },
    },
  });

  let totalPoints = 0;
  let earnedPoints = 0;

  const toCreate: {
    attemptId: number;
    questionId: number;
    choiceId?: number | null;
    textAnswer?: string | null;
    isCorrect?: boolean | null;
    pointsAwarded?: number | null;
  }[] = [];

  for (const question of questions) {
    totalPoints += question.points;
    const answer = map.get(question.id) ?? { choiceIds: [], textAnswer: null };
    const validChoiceIds = Array.isArray(answer.choiceIds) ? answer.choiceIds : [];

    const options = question.choices as Array<{ id: number; isCorrect: boolean }>;
    const correctChoiceIds = new Set(options.filter((opt) => opt.isCorrect).map((opt) => opt.id));

    let isCorrect: boolean | null = null;
    let pointsAwarded = 0;

    switch (question.type) {
      case 'TRUE_FALSE':
      case 'SINGLE_CHOICE': {
        const chosen = validChoiceIds[0] ?? null;
        isCorrect = chosen != null && correctChoiceIds.has(chosen);
        pointsAwarded = isCorrect ? question.points : 0;
        toCreate.push({
          attemptId: attempt.id,
          questionId: question.id,
          choiceId: chosen,
          isCorrect,
          pointsAwarded,
        });
        break;
      }
      case 'MULTI_CHOICE': {
        const chosenSet = new Set(validChoiceIds);
        const matches =
          chosenSet.size === correctChoiceIds.size &&
          [...chosenSet].every((cid) => correctChoiceIds.has(cid));
        isCorrect = matches;
        pointsAwarded = isCorrect ? question.points : 0;

        if (chosenSet.size === 0) {
          toCreate.push({
            attemptId: attempt.id,
            questionId: question.id,
            choiceId: null,
            isCorrect,
            pointsAwarded,
          });
        } else {
          for (const cid of chosenSet) {
            toCreate.push({
              attemptId: attempt.id,
              questionId: question.id,
              choiceId: cid,
              isCorrect,
              pointsAwarded,
            });
          }
        }
        break;
      }
      case 'TEXT': {
        const textAnswer = answer.textAnswer ?? null;
        isCorrect = null;
        pointsAwarded = 0;
        toCreate.push({
          attemptId: attempt.id,
          questionId: question.id,
          textAnswer,
          isCorrect,
          pointsAwarded,
        });
        break;
      }
      default: {
        toCreate.push({
          attemptId: attempt.id,
          questionId: question.id,
          isCorrect: null,
          pointsAwarded: 0,
        });
      }
    }

    earnedPoints += pointsAwarded;
  }

  const percent = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  const score = Number(percent.toFixed(2));
  const passed = percent >= 70;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.attemptAnswer.deleteMany({ where: { attemptId: attempt.id } });
      await tx.attemptAnswer.createMany({ data: toCreate });
      await (tx as any).attempt.update({
        where: { id: attempt.id },
        data: {
          submittedAt: new Date(),
          score,
          passed,
        },
      });

      if (passed && attempt.assetId) {
        await tx.assetProgress.upsert({
          where: { assignmentId_assetId: { assignmentId: attempt.assignmentId, assetId: attempt.assetId } },
          update: { completedAt: new Date() },
          create: {
            assignmentId: attempt.assignmentId,
            assetId: attempt.assetId,
            completedAt: new Date(),
          },
        });
      }

      if (passed) {
        await tx.completion.upsert({
          where: {
            uniq_completion_per_topic: {
              userId: session.userId,
              topicId: attempt.assignment.topicId,
            },
          },
          create: {
            userId: session.userId,
            topicId: attempt.assignment.topicId,
            completedAt: new Date(),
            score,
            certificateUrl: null,
          },
          update: {
            score,
          },
        });
      }
    });
  } catch (err) {
    console.error('Quiz submission failed', err);
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
          ? err
          : 'Unable to submit answers';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, score, passed });
}
