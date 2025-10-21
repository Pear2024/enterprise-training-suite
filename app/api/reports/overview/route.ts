export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSession, hasRole } from '@/lib/auth';
import { getReportsOverview } from '@/lib/reporting';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasRole(session, ['ADMIN', 'TRAINER'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const overview = await getReportsOverview();
  return NextResponse.json(overview);
}
