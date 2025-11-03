export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';

type UserRole = 'ADMIN' | 'TRAINER' | 'EMPLOYEE';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const roleParam = (url.searchParams.get('role') || '').trim().toUpperCase() as UserRole | '';
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const where: Prisma.UserWhereInput = {};
  if (roleParam) {
    where.role = roleParam;
  }
  if (q) {
    where.OR = [
      { username: { contains: q } },
      { email: { contains: q } },
      { firstName: { contains: q } },
      { lastName: { contains: q } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { username: 'asc' },
      skip,
      take,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        department: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
