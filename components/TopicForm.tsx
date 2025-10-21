'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type TopicInput = {
  title: string
  description?: string
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
}

type ApiError = { error?: string }
function isApiError(x: unknown): x is ApiError {
  return typeof x === 'object' && x !== null && 'error' in x
}

export default function TopicForm({
  mode, // 'create' | 'edit'
  initial,
  id, // สำหรับ edit
}: {
  mode: 'create' | 'edit'
  initial?: Partial<TopicInput>
  id?: number
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [status, setStatus] = useState<TopicInput['status']>(initial?.status ?? 'ACTIVE')
  const [error, setError] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)

  const canSubmit = title.trim().length > 0 && !loading

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(undefined)
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(mode === 'create' ? '/api/topics' : `/api/topics/${id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description || undefined,
          status,
        }),
      })

      if (!res.ok) {
        let data: unknown = null
        try {
          data = await res.json()
        } catch {}
        const apiMsg = isApiError(data) ? data.error : undefined
        throw new Error(apiMsg || 'Save failed')
      }

      // กลับไป list พร้อมแถบ Saved successfully
      router.push('/topics?saved=1')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">
          Title <span className="text-red-600">*</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Topic title"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 min-h-24"
          placeholder="Optional description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TopicInput['status'])}
          className="border rounded-lg px-3 py-2"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="DRAFT">DRAFT</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
          aria-disabled={!canSubmit}
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
        <Link href="/topics" className="px-4 py-2 rounded-lg border">
          Cancel
        </Link>
      </div>
    </form>
  )
}





