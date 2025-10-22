export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, hasRole } from '@/lib/auth';

type QuestionType = 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'TRUE_FALSE' | 'TEXT';
type CreatePayload = {
  type: QuestionType;
  text: string;
  order?: number;
  points?: number;
};

export async function POST(req: Request, ctx: { params: Promise<{ assetId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasRole(session, ['ADMIN', 'TRAINER'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { assetId } = await ctx.params;
  const idNum = Number(assetId);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: 'Invalid asset id' }, { status: 400 });

  const body = (await req.json().catch(() => null)) as CreatePayload | null;
  if (!body || !body.type || !body.text) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const asset = await prisma.trainingAsset.findUnique({ where: { id: idNum }, select: { id: true, topicId: true } });
  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  const q = await prisma.question.create({
    data: {
      topicId: asset.topicId,
      assetId: asset.id,
      type: body.type,
      text: body.text,
      order: body.order ?? 1,
      points: body.points ?? 1,
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: q.id }, { status: 201 });
}
