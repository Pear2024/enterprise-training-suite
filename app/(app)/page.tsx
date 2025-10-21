// app/(app)/page.tsx
import { headers } from 'next/headers'
import { getSession } from '@/lib/auth'

type Topic = {
  id: number
  code: string
  title: string
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
  createdAt: string
  updatedAt: string
}
type TopicsJson = { items?: Topic[] }

export default async function Home() {
  const session = await getSession()
  if (!session) {
    // ยังไม่ล็อกอิน → ให้ไปล็อกอินก่อน (หรือจะแสดงลิงก์แทน redirect ก็ได้)
    return (
      <div className="p-6">
        Please <a className="underline" href="/login">sign in</a> to continue.
      </div>
    )
  }

  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const baseUrl = `${proto}://${host}`
  const cookie = h.get('cookie') ?? ''

  const res = await fetch(`${baseUrl}/api/topics`, {
    cache: 'no-store',
    headers: { cookie },
  })
  if (!res.ok) {
    return <div className="p-6">Failed to load topics</div>
  }
  const data = (await res.json()) as TopicsJson
  const items = Array.isArray(data.items) ? data.items : []

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Welcome</h1>
      <ul className="list-disc pl-5">
        {items.map(t => <li key={t.id}>{t.title} ({t.status})</li>)}
        {items.length === 0 && <li className="text-gray-500">No topics</li>}
      </ul>
    </div>
  )
}
