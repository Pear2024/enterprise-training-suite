export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, hasRole } from '@/lib/auth';
import { QuestionType } from '@prisma/client';

type UpdatePayload = {
  type?: QuestionType;
  text?: string;
  order?: number;
  points?: number;
};

export async function PATCH(req: Request, ctx: { params: Promise<{ questionId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasRole(session, ['ADMIN', 'TRAINER'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { questionId } = await ctx.params;
  const idNum = Number(questionId);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as UpdatePayload;
  const q = await prisma.question.update({
    where: { id: idNum },
    data: {
      ...(body.type ? { type: body.type } : {}),
      ...(typeof body.text === 'string' ? { text: body.text } : {}),
      ...(typeof body.order === 'number' ? { order: body.order } : {}),
      ...(typeof body.points === 'number' ? { points: body.points } : {}),
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: q.id });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ questionId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasRole(session, ['ADMIN', 'TRAINER'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { questionId } = await ctx.params;
  const idNum = Number(questionId);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  await prisma.choice.deleteMany({ where: { questionId: idNum } });
  await prisma.question.delete({ where: { id: idNum } });
  return new NextResponse(null, { status: 204 });
}

