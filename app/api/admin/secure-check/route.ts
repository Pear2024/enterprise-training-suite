export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth' // หรือ relative path ถ้าไม่มี alias

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json({ ok: true }, { status: 200 })
}
