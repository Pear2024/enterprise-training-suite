export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

type Payload = { topicId?: number; topicCode?: string };

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Payload | undefined;
  const topicId = body?.topicId;
  const topicCode = body?.topicCode;

  let topic = null as null | { id: number };
  if (typeof topicId === 'number' && Number.isFinite(topicId)) {
    topic = await prisma.trainingTopic.findUnique({ where: { id: topicId }, select: { id: true } });
  } else if (typeof topicCode === 'string' && topicCode.trim()) {
    topic = await prisma.trainingTopic.findUnique({ where: { code: topicCode.trim() }, select: { id: true } });
  }

  if (!topic) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  const asg = await prisma.assignment.upsert({
    where: { uniq_user_topic_once: { userId: session.userId, topicId: topic.id } },
    update: {},
    create: { userId: session.userId, topicId: topic.id },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, assignmentId: asg.id });
}

