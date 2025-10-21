export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, hasRole } from '@/lib/auth';
import { AssetType } from '@prisma/client';

type UpdatePayload = {
  type?: AssetType;
  title?: string;
  url?: string | null;
  htmlContent?: string | null;
  order?: number;
  isRequired?: boolean;
  durationSec?: number | null;
  thumbnailUrl?: string | null;
};

export async function PATCH(req: Request, ctx: { params: Promise<{ assetId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasRole(session, ['ADMIN', 'TRAINER'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { assetId } = await ctx.params;
  const idNum = Number(assetId);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as UpdatePayload;
  const asset = await prisma.trainingAsset.update({
    where: { id: idNum },
    data: {
      ...(body.type ? { type: body.type } : {}),
      ...(typeof body.title === 'string' ? { title: body.title } : {}),
      ...(body.url !== undefined ? { url: body.url } : {}),
      ...(body.htmlContent !== undefined ? { htmlContent: body.htmlContent } : {}),
      ...(typeof body.order === 'number' ? { order: body.order } : {}),
      ...(typeof body.isRequired === 'boolean' ? { isRequired: body.isRequired } : {}),
      ...(body.durationSec !== undefined ? { durationSec: body.durationSec } : {}),
      ...(body.thumbnailUrl !== undefined ? { thumbnailUrl: body.thumbnailUrl } : {}),
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: asset.id });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ assetId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasRole(session, ['ADMIN', 'TRAINER'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { assetId } = await ctx.params;
  const idNum = Number(assetId);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  await prisma.trainingAsset.delete({ where: { id: idNum } });
  return new NextResponse(null, { status: 204 });
}

