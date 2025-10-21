// app/api/topics/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Prisma, type TopicStatus } from '@prisma/client';
import { z, ZodError } from 'zod';

/* ---------------- helpers ---------------- */
type UserRole = 'ADMIN' | 'TRAINER' | 'EMPLOYEE';

function getRole(session: unknown): UserRole | null {
  if (session && typeof session === 'object') {
    const r = (session as Record<string, unknown>).role;
    if (r === 'ADMIN' || r === 'TRAINER' || r === 'EMPLOYEE') return r;
  }
  return null;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

async function genUniqueCode(title: string) {
  const base = slugify(title);
  for (let i = 0; i < 8; i++) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const code = `${base}-${suffix}`;
    const exists = await prisma.trainingTopic.findUnique({ where: { code } });
    if (!exists) return code;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function isNum(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

async function resolveCurrentUserId(session: unknown): Promise<number | null> {
  if (session && typeof session === 'object') {
    const s = session as Record<string, unknown>;
    if (isNum(s.userId)) return s.userId as number;
    if (isNum(s.id)) return s.id as number;

    if (typeof s.username === 'string') {
      const u = await prisma.user.findUnique({ where: { username: s.username as string } });
      if (u) return u.id;
    }
    if (typeof s.email === 'string') {
      const u = await prisma.user.findUnique({ where: { email: s.email as string } });
      if (u) return u.id;
    }
  }
  return null;
}

/* ---------------- GET: list topics (with pagination) ---------------- */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = getRole(session);
  const isWriter = role === 'ADMIN' || role === 'TRAINER';

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const statusParam = (url.searchParams.get('status') || '').trim();

  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 10)));
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const statusFilter: TopicStatus | '' = isWriter ? (statusParam as TopicStatus | '') : 'ACTIVE';

  const where: Prisma.TrainingTopicWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } }, // case-insensitive ขึ้นกับ collation ของ DB
            { code: { contains: q } },
          ],
        }
      : {}),
  };

  try {
    const [total, topics] = await Promise.all([
      prisma.trainingTopic.count({ where }),
      prisma.trainingTopic.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const items = topics.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (e) {
    console.error('GET /api/topics failed', e);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

/* ---------------- POST: create topic ---------------- */
const createTopicSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(10000).optional().transform((v) => (v ?? '').trim()),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'DRAFT']).default('ACTIVE'),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = getRole(session);
  if (role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const ctype = req.headers.get('content-type') || '';
    let payload: unknown;

    if (ctype.includes('application/json')) {
      payload = await req.json();
    } else {
      const fd = await req.formData();
      payload = {
        title: String(fd.get('title') ?? ''),
        description: String(fd.get('description') ?? ''),
        status: String(fd.get('status') ?? 'ACTIVE'),
      };
    }

    const parsed = createTopicSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const code = await genUniqueCode(data.title);

    const creatorId = await resolveCurrentUserId(session);
    if (creatorId == null) {
      return NextResponse.json({ error: 'Cannot resolve current user id' }, { status: 500 });
    }

    const topic = await prisma.trainingTopic.create({
      data: {
        code,
        title: data.title,
        description: data.description || null,
        status: data.status as TopicStatus,
        createdById: creatorId,
      },
      select: { id: true, code: true },
    });

    if (!ctype.includes('application/json')) {
      const url = new URL(req.url);
      return NextResponse.redirect(new URL('/topics?saved=1', url), 303);
    }

    return NextResponse.json({ ok: true, id: topic.id, code: topic.code }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate code' }, { status: 409 });
    }
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.flatten() }, { status: 400 });
    }
    console.error('POST /api/topics failed', e);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}
