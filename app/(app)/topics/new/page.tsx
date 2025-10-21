import { getSession } from '@/lib/auth'
import TopicForm from '@/components/TopicForm'

export default async function NewTopicPage() {
  const session = await getSession()
  if (!session) return <div className="p-6">Unauthorized</div>
  if (session.role !== 'ADMIN' && session.role !== 'TRAINER') return <div className="p-6">Forbidden</div>

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Add New Topic</h1>
      <TopicForm mode="create" />
    </div>
  )
}
