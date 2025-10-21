// lib/auth.ts
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import type { SessionPayload } from '@/types/session';

// ✅ ให้ตรงกับ /api/auth/login
export const COOKIE_NAME = 'tsession';
const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev_secret_change_me');

// หมายเหตุ: login route ปัจจุบันไม่ได้ set issuer/audience
// เพื่อความเข้ากันได้ เราจะไม่บังคับตรวจ iss/aud ใน jwtVerify

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret); // ไม่ระบุ iss/aud เพื่อรับ token เดิม

    // รองรับได้ทั้งสองรูปแบบ: { userId } หรือ { sub }
    const userId =
      typeof payload.userId === 'number'
        ? payload.userId
        : typeof payload.sub === 'string'
          ? Number(payload.sub)
          : NaN;

    if (!Number.isFinite(userId)) return null;
    if (typeof payload.username !== 'string') return null;
    if (typeof payload.role !== 'string') return null;

    return {
      userId,
      username: payload.username,
      role: payload.role as SessionPayload['role'],
    };
  } catch {
    return null;
  }
}

export async function setSession(p: SessionPayload, maxAgeSec = 60 * 60 * 24 * 7) {
  // ออก token รูปแบบเดียวกับ login route: { sub, username, role }
  const token = await new SignJWT({
    sub: String(p.userId),
    username: p.username,
    role: p.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(secret);

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSec,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export function hasRole(session: SessionPayload | null, roles: SessionPayload['role'][]): boolean {
  return !!session && roles.includes(session.role);
}
