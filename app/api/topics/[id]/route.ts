export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const idNum = Number(id);

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!Number.isInteger(idNum)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    await prisma.trainingTopic.delete({ where: { id: idNum } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('DELETE /api/topics/[id] failed', e);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
