export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth' // ถ้า alias @ ไม่ได้ ใช้: ../../../../lib/auth

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(
    { id: session.userId, username: session.username, role: session.role },
    { status: 200 }
  )
}
