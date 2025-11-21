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
    return (
      <div className="p-6">
        Please <a className="underline" href="/login">sign in</a> to continue.
      </div>
    )
  }

  const h = await headers()
  const hostHeader = h.get('host') ?? 'localhost:3000'
  const protoHeader = h.get('x-forwarded-proto') ?? 'http'

  let host = hostHeader
  if (host.startsWith('localhost')) {
    host = host.replace('localhost', '127.0.0.1')
  } else if (host.startsWith('[')) {
    const ipv6 = host.match(/^\[([^\]]+)\](?::(\d+))?$/)
    if (ipv6 && ipv6[1] === '::1') {
      host = `127.0.0.1${ipv6[2] ? `:${ipv6[2]}` : ''}`
    }
  } else if (host === '::1') {
    host = '127.0.0.1'
  }

  const baseUrl = `${protoHeader}://${host}`
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

  const isAdmin = session.role === 'ADMIN'

  return (
    <div className="p-6 space-y-6">
      {isAdmin ? (
        <section className="space-y-3">
          <h1 className="text-3xl font-semibold">
            Welcome, {session.username}
          </h1>
          <p>
            As a <strong>Administrator</strong>, you can:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>Create, edit and retire training topics.</li>
            <li>Configure assets, quizzes and per-asset questions.</li>
            <li>Assign trainings to employees and trainers in bulk.</li>
            <li>Review system-wide reports and completion metrics.</li>
            <li>Manage platform settings from the Admin area.</li>
          </ul>
          <p className="text-gray-700">
            Use the navigation on the left to jump into each area.
          </p>
        </section>
      ) : (
        <section className="space-y-2">
          <h1 className="text-2xl font-bold">Welcome</h1>
          <p className="text-gray-700">
            Select a section on the left to continue.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-2">Latest topics</h2>
        <ul className="list-disc pl-5 space-y-1">
          {items.map((t) => (
            <li key={t.id}>
              {t.title} ({t.status})
            </li>
          ))}
          {items.length === 0 && (
            <li className="text-gray-500">No topics</li>
          )}
        </ul>
      </section>
    </div>
  )
}
