// app/api/auth/login/route.ts
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { SignJWT } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev_secret_change_me')

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user?.passwordHash) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await new SignJWT({
    sub: String(user.id),
    username: user.username,
    role: user.role as 'EMPLOYEE' | 'TRAINER' | 'ADMIN',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)

  const forwardedProto = req.headers.get('x-forwarded-proto') || ''
  const protoList = forwardedProto.split(',').map((p) => p.trim()).filter(Boolean)
  const requestIsHttps = protoList[0] === 'https' || req.url.startsWith('https://')
  const secureFlagEnv = process.env.APP_FORCE_SECURE_COOKIE
  const secureCookie =
    secureFlagEnv === 'true'
      ? true
      : secureFlagEnv === 'false'
        ? false
        : process.env.NODE_ENV === 'production' && requestIsHttps

  const res = NextResponse.json({ ok: true })
  res.cookies.set('tsession', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
