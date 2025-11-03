// app/api/auth/logout/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

const DEFAULT_BASE =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.APP_BASE_URL ||
  'http://localhost:3000';

export async function POST(req: Request) {
  await clearSession();
  const origin =
    req.headers.get('origin') ??
    req.headers.get('referer') ??
    DEFAULT_BASE;
  return NextResponse.redirect(new URL('/login', origin));
}
