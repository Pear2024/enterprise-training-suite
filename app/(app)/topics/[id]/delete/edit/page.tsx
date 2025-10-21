// app/(app)/topics/[id]/edit/page.tsx

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Link from "next/link";

type Params = { id: string };

// Next 15: params เป็น Promise ต้อง await
export default async function EditTopicPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<Record<string, string>>;
}) {
  const session = await getSession();
  if (!session) return <div className="p-6">Unauthorized</div>;

  if (session.role === "EMPLOYEE") return <div className="p-6">Forbidden</div>;

  const { id } = await params;
  const topicId = Number(id);
  if (!Number.isInteger(topicId)) return <div className="p-6">Invalid id</div>;

  const topic = await prisma.trainingTopic.findUnique({
    where: { id: topicId },
    select: { id: true, code: true, title: true, description: true, status: true },
  });

  if (!topic) return <div className="p-6">Not found</div>;

  const sp = (await searchParams) ?? {};
  const err = sp.error;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Topic</h1>
        <Link href="/topics" className="underline">
          ← Back to Topics
        </Link>
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-2">
          {err === "notfound" ? "Topic not found" : "Update failed"}
        </div>
      )}

      <form action={`/topics/${topic.id}/edit`} method="POST" className="space-y-4 max-w-3xl">
        <div>
          <label className="block mb-1 font-medium">Title *</label>
          <input
            name="title"
            defaultValue={topic.title}
            required
            maxLength={255}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Description</label>
          <textarea
            name="description"
            defaultValue={topic.description ?? ""}
            rows={6}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Status</label>
          <select
            name="status"
            defaultValue={topic.status}
            className="border rounded-lg px-3 py-2"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button className="rounded-xl px-4 py-2 bg-black text-white hover:opacity-90">
            Save
          </button>
          <Link href="/topics" className="px-4 py-2 border rounded-xl">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
