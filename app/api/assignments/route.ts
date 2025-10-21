export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, hasRole } from '@/lib/auth';
import { AssignmentStatus } from '@prisma/client';

type JsonPayload = {
  // single assign (legacy)
  userId?: number;
  topicId?: number;
  // bulk assign
  userIds?: number[];
  topicIds?: number[];
  dueAt?: string | null;
  status?: AssignmentStatus;
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasRole(session, ['ADMIN', 'TRAINER'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ctype = req.headers.get('content-type') || '';
  let payload: JsonPayload = {};

  if (ctype.includes('application/json')) {
    payload = (await req.json().catch(() => ({}))) as JsonPayload;
  } else {
    const fd = await req.formData();
    const userIdsRaw = fd.getAll('userIds');
    const topicIdsRaw = fd.getAll('topicIds');
    // also accept legacy single fields
    const singleUserId = fd.get('userId');
    const singleTopicId = fd.get('topicId');
    const toNums = (v: unknown[]) => (
      v
        .map((x) => Number(typeof x === 'string' ? x : String(x)))
        .filter((n) => Number.isFinite(n)) as number[]
    );
    payload = {
      userIds: userIdsRaw.length ? toNums(userIdsRaw) : (singleUserId ? toNums([singleUserId]) : []),
      topicIds: topicIdsRaw.length ? toNums(topicIdsRaw) : (singleTopicId ? toNums([singleTopicId]) : []),
      dueAt: (fd.get('dueAt') as string) || null,
      status: (fd.get('status') as AssignmentStatus) || AssignmentStatus.ASSIGNED,
    };
  }

  // normalize inputs (support both single and bulk)
  const users: number[] = (payload.userIds && payload.userIds.length
    ? payload.userIds
    : (Number.isFinite(payload.userId as number) ? [Number(payload.userId)] : [])) as number[];
  const topics: number[] = (payload.topicIds && payload.topicIds.length
    ? payload.topicIds
    : (Number.isFinite(payload.topicId as number) ? [Number(payload.topicId)] : [])) as number[];

  const uniq = (arr: number[]) => Array.from(new Set(arr.filter((n) => Number.isFinite(n))));
  const userIds = uniq(users);
  const topicIds = uniq(topics);
  if (!userIds.length || !topicIds.length) {
    return NextResponse.json({ error: 'No users/topics selected' }, { status: 400 });
  }

  // validate existence minimally
  const [existingUsers, existingTopics] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true } }),
    prisma.trainingTopic.findMany({ where: { id: { in: topicIds } }, select: { id: true } }),
  ]);
  const validUserIds = new Set(existingUsers.map((u) => u.id));
  const validTopicIds = new Set(existingTopics.map((t) => t.id));

  const due = payload.dueAt ? new Date(payload.dueAt) : null;
  const status = payload.status || AssignmentStatus.ASSIGNED;

  let count = 0;
  for (const uid of userIds) {
    if (!validUserIds.has(uid)) continue;
    for (const tid of topicIds) {
      if (!validTopicIds.has(tid)) continue;
      await prisma.assignment.upsert({
        where: { uniq_user_topic_once: { userId: uid, topicId: tid } },
        update: { ...(due ? { dueAt: due } : {}), status },
        create: { userId: uid, topicId: tid, dueAt: due, status },
      });
      count++;
    }
  }

  if (!ctype.includes('application/json')) {
    const url = new URL(`/assignments?saved=1&count=${count}`, req.url);
    return NextResponse.redirect(url, 303);
  }

  return NextResponse.json({ ok: true, count }, { status: 201 });
}
