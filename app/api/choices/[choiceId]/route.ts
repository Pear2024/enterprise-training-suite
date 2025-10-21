export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, hasRole } from '@/lib/auth';

type UpdateChoice = { text?: string; isCorrect?: boolean; order?: number };

export async function PATCH(req: Request, ctx: { params: Promise<{ choiceId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasRole(session, ['ADMIN', 'TRAINER'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { choiceId } = await ctx.params;
  const idNum = Number(choiceId);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as UpdateChoice;
  const c = await prisma.choice.update({
    where: { id: idNum },
    data: {
      ...(typeof body.text === 'string' ? { text: body.text } : {}),
      ...(typeof body.isCorrect === 'boolean' ? { isCorrect: body.isCorrect } : {}),
      ...(typeof body.order === 'number' ? { order: body.order } : {}),
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: c.id });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ choiceId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasRole(session, ['ADMIN', 'TRAINER'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { choiceId } = await ctx.params;
  const idNum = Number(choiceId);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  await prisma.choice.delete({ where: { id: idNum } });
  return new NextResponse(null, { status: 204 });
}

