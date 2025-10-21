//
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const idNum = Number(id);

  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL('/topics?error=unauth', req.url), 303);
  if (session.role === 'EMPLOYEE') return NextResponse.redirect(new URL('/topics?error=forbidden', req.url), 303);
  if (!Number.isInteger(idNum)) return NextResponse.redirect(new URL('/topics?error=badid', req.url), 303);

  try {
    await prisma.trainingTopic.delete({ where: { id: idNum } });
    return NextResponse.redirect(new URL('/topics?deleted=1', req.url), 303);
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.redirect(new URL('/topics?error=notfound', req.url), 303);
    }
    console.error('POST /topics/[id]/delete failed', e);
    return NextResponse.redirect(new URL('/topics?error=delete_failed', req.url), 303);
  }
}
