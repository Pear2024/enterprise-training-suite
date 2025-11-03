import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/db';

type SheetRow = {
  employee_number?: string | number;
  first_name?: string;
  last_name?: string;
  first_name_last_name?: string;
  email?: string;
  phone?: string | number;
  supervisor?: string;
};

const SYNC_TOKEN = process.env.CRON_SYNC_TOKEN;
const EMAIL_DOMAIN = process.env.SYNC_EMAIL_DOMAIN;
const DEFAULT_PASSWORD = process.env.SYNC_DEFAULT_PASSWORD ?? 'pass123';
const DEFAULT_PASSWORD_HASH =
  process.env.SYNC_DEFAULT_PASSWORD_HASH ?? bcrypt.hashSync(DEFAULT_PASSWORD, 10);

const CHUNK_SIZE = 100;

export async function POST(request: NextRequest) {
  if (!SYNC_TOKEN) {
    console.error('CRON_SYNC_TOKEN is not configured');
    return NextResponse.json(
      { error: 'sync configuration missing' },
      { status: 500 },
    );
  }

  if (request.headers.get('x-sync-token') !== SYNC_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    console.error('Failed to parse request body', error);
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  if (!Array.isArray(payload)) {
    return NextResponse.json({ error: 'expected array payload' }, { status: 400 });
  }

  const rows = payload as SheetRow[];
  const usernames: string[] = [];
  const operations: Array<ReturnType<typeof buildUpsert>> = [];

  for (const rawRow of rows) {
    const normalized = normalizeRow(rawRow);
    if (!normalized) continue;

    usernames.push(normalized.username);
    operations.push(buildUpsert(normalized));
  }

  if (operations.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  try {
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const chunk = operations.slice(i, i + CHUNK_SIZE);
      await prisma.$transaction(chunk, { timeout: 60_000 });
    }
  } catch (error) {
    console.error('Failed to upsert users from sheet', error);
    return NextResponse.json({ error: 'sync failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, processed: operations.length });
}

function normalizeRow(raw: SheetRow) {
  const username = stringify(raw.employee_number);

  if (!username) return null;

  const email = determineEmail(username, raw.email);
  if (!email) {
    console.warn(`Skipping employee ${username}: missing email and SYNC_EMAIL_DOMAIN not set`);
    return null;
  }

  const fullNameRaw =
    raw.first_name_last_name ??
    [raw.first_name, raw.last_name].filter(Boolean).join(' ').trim();

  const { firstName, lastName } = splitName(fullNameRaw);
  const phone = stringify(raw.phone);
  const supervisorEmail = (raw.supervisor ?? '').toString().trim().toLowerCase() || null;

  return {
    username,
    email,
    firstName,
    lastName,
    phone: phone || null,
    supervisorEmail,
  };
}

function buildUpsert(data: {
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  supervisorEmail?: string | null;
}) {
  const updateData: Record<string, string | null | undefined> = {};
  updateData.email = data.email;
  updateData.firstName = data.firstName ?? null;
  updateData.lastName = data.lastName ?? null;
  updateData.phone = data.phone ?? null;
  updateData.supervisorEmail = data.supervisorEmail ?? null;

  return prisma.user.upsert({
    where: { username: data.username },
    update: updateData,
    create: {
      username: data.username,
      email: data.email,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      phone: data.phone ?? null,
      supervisorEmail: data.supervisorEmail ?? null,
      passwordHash: DEFAULT_PASSWORD_HASH,
      role: 'EMPLOYEE',
    },
  });
}

function stringify(input: string | number | undefined) {
  if (input === undefined || input === null) return '';
  return String(input).trim();
}

function determineEmail(username: string, supplied?: string) {
  const candidate = supplied ? supplied.trim() : '';
  if (candidate) return candidate.toLowerCase();
  if (!EMAIL_DOMAIN) return null;
  return `${username}@${EMAIL_DOMAIN}`.toLowerCase();
}

function splitName(fullName?: string) {
  if (!fullName) return { firstName: null, lastName: null };

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }

  const lastName = parts.pop() ?? null;
  const firstName = parts.join(' ') || null;
  return { firstName, lastName };
}
