export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, hasRole } from '@/lib/auth';
import { AssetType } from '@prisma/client';

type CreatePayload = {
  type: AssetType;
  title: string;
  url?: string | null;
  htmlContent?: string | null;
  order?: number;
  isRequired?: boolean;
  durationSec?: number | null;
  thumbnailUrl?: string | null;
};

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasRole(session, ['ADMIN', 'TRAINER'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  const topicId = Number(id);
  if (!Number.isFinite(topicId)) return NextResponse.json({ error: 'Invalid topic id' }, { status: 400 });

  const payload = (await _req.json().catch(() => null)) as CreatePayload | null;
  if (!payload || !payload.title || !payload.type) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const topic = await prisma.trainingTopic.findUnique({ where: { id: topicId }, select: { id: true } });
  if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });

  const asset = await prisma.trainingAsset.create({
    data: {
      topicId,
      type: payload.type,
      title: payload.title,
      url: payload.url ?? null,
      htmlContent: payload.htmlContent ?? null,
      order: payload.order ?? 1,
      isRequired: payload.isRequired ?? true,
      durationSec: payload.durationSec ?? null,
      thumbnailUrl: payload.thumbnailUrl ?? null,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: asset.id }, { status: 201 });
}

