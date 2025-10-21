// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE = 'tsession'
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev_secret')

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // ✅ allowlist (ปล่อยทุก /api/*)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||      // ← เปลี่ยนมาอนุญาตทั้ง /api
    pathname === '/login' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get(COOKIE)?.value
  if (!token) {
    const url = new URL('/login', req.url)
    url.searchParams.set('next', pathname + search)
    return NextResponse.redirect(url)
  }

  try {
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    const url = new URL('/login', req.url)
    url.searchParams.set('next', pathname + search)
    return NextResponse.redirect(url)
  }
}

export const config = { matcher: ['/((?!_next|favicon.ico).*)'] }
