import { getSession } from '@/lib/auth'

async function getTopic(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/topics/${id}`, { cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json()
  return data.topic as { id: number; title: string; description?: string; status: 'ACTIVE'|'DRAFT'|'ARCHIVED' }
}

import TopicForm from '@/components/TopicForm'

export default async function EditTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return <div className="p-6">Unauthorized</div>
  if (session.role !== 'ADMIN' && session.role !== 'TRAINER') return <div className="p-6">Forbidden</div>

  const { id } = await params
  const topic = await getTopic(id)
  if (!topic) return <div className="p-6">Not Found</div>

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Edit Topic</h1>
      <TopicForm mode="edit" id={topic.id} initial={topic} />
    </div>
  )
}
