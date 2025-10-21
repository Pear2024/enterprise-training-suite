// components/DeleteTopicButton.tsx
'use client'
export default function DeleteTopicButton({ id }: { id: number }) {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!confirm('Delete this topic?')) e.preventDefault()
  }
  return (
    <form className="inline" action={`/topics/${id}/delete`} method="POST">
      <button type="submit" onClick={handleClick} className="text-red-600 underline" aria-label="Delete topic">
        Delete
      </button>
    </form>
  )
}
