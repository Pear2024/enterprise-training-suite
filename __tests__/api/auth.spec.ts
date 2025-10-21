// __tests__/api/auth.spec.ts
import { describe, it, expect } from 'vitest'
import { request } from 'undici'

/** ===== Config (ปรับได้) ===== */
const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

// ผู้ใช้หลักที่ใช้ทดสอบ login/logout
const TEST_USER = process.env.TEST_USER ?? 'emp'
const TEST_PASS = process.env.TEST_PASS ?? 'pass123'

// RBAC endpoints — ปรับให้ตรงกับโปรเจกต์จริงของคุณ
const PROTECTED_URL   = process.env.TEST_PROTECTED_URL   ?? '/api/profile'              // ต้องล็อกอินถึงจะได้ 200
const ADMIN_ONLY_URL  = process.env.TEST_ADMIN_ONLY_URL  ?? '/api/admin/secure-check'   // ต้องเป็น ADMIN เท่านั้น

// ผู้ใช้ตาม role (คุณบอกว่ามี admin, emp, trainer รหัสเหมือนกันหมด)
const ADMIN_USER = process.env.TEST_ADMIN_USER ?? 'admin'
const ADMIN_PASS = process.env.TEST_ADMIN_PASS ?? 'pass123'
const EMP_USER   = process.env.TEST_EMP_USER   ?? 'emp'
const EMP_PASS   = process.env.TEST_EMP_PASS   ?? 'pass123'
const TRAIN_USER = process.env.TEST_TRAIN_USER ?? 'trainer'
const TRAIN_PASS = process.env.TEST_TRAIN_PASS ?? 'pass123'

/** ===== Helpers ===== */
function getCookieFromSetCookie(h?: string | string[]) {
  const raw = Array.isArray(h) ? h[0] : (h ?? '')
  const first = raw.split(';')[0]?.trim()
  return first || ''
}
function hasHttpOnly(h?: string | string[]) {
  const raw = Array.isArray(h) ? h.join('; ') : (h ?? '')
  return /httponly/i.test(raw)
}
function hasPathRoot(h?: string | string[]) {
  const raw = Array.isArray(h) ? h.join('; ') : (h ?? '')
  return /Path=\//i.test(raw)
}
function isClearCookie(h?: string | string[]) {
  const raw = Array.isArray(h) ? h.join('; ') : (h ?? '')
  return /Max-Age=0/i.test(raw) || /Expires=/i.test(raw)
}
async function loginAs(u: string, p: string) {
  const res = await request(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username: u, password: p }),
    headers: { 'content-type': 'application/json' },
  })
  expect(res.statusCode).toBe(200)
  return getCookieFromSetCookie(res.headers['set-cookie'])
}

/** ===== Auth API tests ===== */
describe('Auth API', () => {
  it('login success should set HttpOnly cookie', async () => {
    const res = await request(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: TEST_USER, password: TEST_PASS }),
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(200)
    const setCookie = res.headers['set-cookie']
    expect(setCookie).toBeTruthy()
    expect(hasHttpOnly(setCookie)).toBe(true)
    expect(hasPathRoot(setCookie)).toBe(true)
  })

  it('logout should clear cookie', async () => {
    const login = await request(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: TEST_USER, password: TEST_PASS }),
      headers: { 'content-type': 'application/json' },
    })
    expect(login.statusCode).toBe(200)
    const cookie = getCookieFromSetCookie(login.headers['set-cookie'])
    expect(cookie).not.toBe('')

    const logout = await request(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { cookie },
    })

    // ยอมรับทั้ง 200/30x เพราะบางโปรเจกต์ redirect หลัง logout
    expect([200, 302, 303, 307]).toContain(logout.statusCode)
    expect(isClearCookie(logout.headers['set-cookie'])).toBe(true)
  })
})

/** ===== RBAC tests ===== */
describe('RBAC', () => {
  it('blocks when not logged in', async () => {
    const res = await request(`${BASE_URL}${PROTECTED_URL}`, { method: 'GET' })
    expect([401, 403]).toContain(res.statusCode)
  })

  it('allows EMPLOYEE after login on protected (non-admin) route', async () => {
    const cookie = await loginAs(EMP_USER, EMP_PASS)
    const res = await request(`${BASE_URL}${PROTECTED_URL}`, { headers: { cookie } })
    expect(res.statusCode).toBe(200)
  })

  it('forbids EMPLOYEE on admin-only route', async () => {
    const cookie = await loginAs(EMP_USER, EMP_PASS)
    const res = await request(`${BASE_URL}${ADMIN_ONLY_URL}`, { headers: { cookie } })
    expect([401, 403]).toContain(res.statusCode)
  })

  it('forbids TRAINER on admin-only route', async () => {
    const cookie = await loginAs(TRAIN_USER, TRAIN_PASS)
    const res = await request(`${BASE_URL}${ADMIN_ONLY_URL}`, { headers: { cookie } })
    expect([401, 403]).toContain(res.statusCode)
  })

  it('allows ADMIN on admin-only route', async () => {
    const cookie = await loginAs(ADMIN_USER, ADMIN_PASS)
    const res = await request(`${BASE_URL}${ADMIN_ONLY_URL}`, { headers: { cookie } })
    expect(res.statusCode).toBe(200)
  })
})
