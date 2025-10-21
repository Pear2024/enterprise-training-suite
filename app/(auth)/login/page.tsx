// app/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null); setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: fd.get('username'), password: fd.get('password') })
    })
    setLoading(false)
    if (!res.ok) { setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'); return }
    const j = await res.json()
    router.replace((sp.get('next') || j.redirectTo || '/') as string)
    router.refresh();
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 border rounded-2xl p-6">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <div><label className="text-sm">Username</label><input name="username" className="w-full border rounded px-3 py-2" required /></div>
        <div><label className="text-sm">Password</label><input name="password" type="password" className="w-full border rounded px-3 py-2" required /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-2xl py-2 border bg-black text-white disabled:opacity-50">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
