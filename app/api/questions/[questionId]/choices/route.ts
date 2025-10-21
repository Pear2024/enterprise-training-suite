export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, hasRole } from '@/lib/auth';

type CreateChoice = { text: string; isCorrect?: boolean; order?: number };

export async function POST(req: Request, ctx: { params: Promise<{ questionId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasRole(session, ['ADMIN', 'TRAINER'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { questionId } = await ctx.params;
  const idNum = Number(questionId);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: 'Invalid question id' }, { status: 400 });

  const body = (await req.json().catch(() => null)) as CreateChoice | null;
  if (!body || !body.text) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const choice = await prisma.choice.create({
    data: {
      questionId: idNum,
      text: body.text,
      isCorrect: !!body.isCorrect,
      order: body.order ?? 1,
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: choice.id }, { status: 201 });
}

