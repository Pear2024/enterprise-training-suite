export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSession, hasRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

type IncomingRange = {
  minCorrect: number;
  message: string;
};

type IncomingPayload = {
  ranges?: IncomingRange[];
};

function sanitizeRanges(payload: IncomingPayload): IncomingRange[] | null {
  if (!payload || !Array.isArray(payload.ranges)) return null;
  const transformed = payload.ranges
    .filter((entry) => typeof entry.minCorrect === 'number' && typeof entry.message === 'string')
    .map((entry) => ({
      minCorrect: Math.max(0, Math.floor(entry.minCorrect)),
      message: entry.message.trim(),
    }))
    .filter((entry) => entry.message.length > 0)
    .sort((a, b) => b.minCorrect - a.minCorrect);

  return transformed.length ? transformed : [];
}

export async function PUT(request: Request, ctx: { params: Promise<{ assetId: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasRole(session, ['ADMIN', 'TRAINER'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { assetId } = await ctx.params;
  const assetIdNum = Number(assetId);
  if (!Number.isFinite(assetIdNum)) {
    return NextResponse.json({ error: 'Invalid asset id' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as IncomingPayload | null;
  const sanitized = sanitizeRanges(body ?? {});
  if (!sanitized) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const quizFeedbackJson = sanitized.length ? JSON.stringify({ ranges: sanitized }) : null;

  await prisma.trainingAsset.update({
    where: { id: assetIdNum },
    data: { quizFeedbackJson },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ assetId: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasRole(session, ['ADMIN', 'TRAINER'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { assetId } = await ctx.params;
  const assetIdNum = Number(assetId);
  if (!Number.isFinite(assetIdNum)) {
    return NextResponse.json({ error: 'Invalid asset id' }, { status: 400 });
  }

  await prisma.trainingAsset.update({
    where: { id: assetIdNum },
    data: { quizFeedbackJson: null },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}
