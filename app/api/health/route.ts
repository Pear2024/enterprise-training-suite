// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const now = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() AS now`
    return NextResponse.json({ ok: true, dbTime: now?.[0]?.now ?? null })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
