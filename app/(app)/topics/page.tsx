// app/(app)/topics/page.tsx
import { headers, cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import DeleteTopicButton from "@/components/DeleteTopicButton";

type Topic = {
  id: number;
  code: string;
  title: string;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
  createdAt: string;
  updatedAt: string;
};

// Next 15: searchParams เป็น Promise
export default async function TopicsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string>>;
}) {
  const session = await getSession();
  if (!session) return <div className="p-6">Unauthorized</div>;

  const params = (await searchParams) ?? {};

  const page = Math.max(1, Number(params.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(params.pageSize ?? 10)));

  const q = params.q ?? "";
  const saved = params.saved === "1";
  const deleted = params.deleted === "1";

  const updated = params.updated === "1";

  // admin/trainer เห็นได้ทุกสถานะ, employee เห็นเฉพาะ ACTIVE

  const isWriter = session.role === "ADMIN" || session.role === "TRAINER";
  const statusFilter = isWriter ? params.status ?? "" : "ACTIVE";

  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (statusFilter) qs.set("status", statusFilter);
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));

  // ใช้ dynamic headers/cookies แบบ await (ตาม Next 15)
  const h = await headers();
  const cookieStore = await cookies();

  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${host}`;

  const apiPath = qs.toString()
    ? `/api/topics?${qs.toString()}`
    : `/api/topics`;
  const apiUrl = `${baseUrl}/api/topics?${qs.toString()}`;

  // ส่ง cookie ต่อให้ API เพื่อให้ getSession ใน API ใช้ได้
  const res = await fetch(apiUrl, {
    cache: "no-store",
    headers: { cookie: cookieStore.toString() },
  });

  if (!res.ok) {
    return <div className="p-6">Failed to load topics</div>;
  }

  // ---------- รูปแบบข้อมูลที่ API ส่งกลับ (มี pagination) ----------
  type TopicsResponse = {
    items?: Topic[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  const json: TopicsResponse = await res.json();
  const items: Topic[] = Array.isArray(json.items) ? json.items : [];
  const totalPages = json.totalPages ?? 1;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Topics</h1>
        {isWriter && (
          <Link
            href="/topics/new"
            className="rounded-xl px-4 py-2 bg-black text-white hover:opacity-90"
          >
            Add New Topic
          </Link>
        )}
      </div>

      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 text-green-800 px-4 py-2">
          Saved successfully
        </div>
      )}
      {updated && (
        <div className="rounded-lg border border-green-200 bg-green-50 text-green-800 px-4 py-2">
          Updated successfully
        </div>
      )}

      {deleted && (
        <div className="rounded-lg border border-green-200 bg-green-50 text-green-800 px-4 py-2">
          Deleted successfully
        </div>
      )}

      {/* ค้นหา + กรองสถานะ */}
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title/code…"
          className="border rounded-lg px-3 py-2 w-64"
        />

        {isWriter && (
          <select
            name="status"
            defaultValue={statusFilter}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        )}

        {/* 👇 เพิ่มตรงนี้ */}
        <select
          name="pageSize"
          defaultValue={String(pageSize)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="10">10 / page</option>
          <option value="20">20 / page</option>
          <option value="50">50 / page</option>
        </select>

        {/* รีเซ็ตให้เริ่มที่หน้า 1 ทุกครั้งที่กด Filter */}
        <input type="hidden" name="page" value="1" />

        <button className="px-4 py-2 border rounded-lg">Filter</button>
      </form>

      {/* ตารางรายการ */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 border">Code</th>
              <th className="p-2 border">Title</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border w-56">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="odd:bg-white even:bg-gray-50">
                <td className="p-2 border">{t.code}</td>
                <td className="p-2 border">{t.title}</td>
                <td className="p-2 border">{t.status}</td>
                <td className="p-2 border">
                  <Link className="underline mr-3" href={`/topics/${t.id}`}>
                    View
                  </Link>
                  {isWriter && (
                    <>
                      <Link
                        className="underline mr-3"
                        href={`/topics/${t.id}/edit`}
                      >
                        Edit
                      </Link>
                      {/* ปุ่มลบแบบฟอร์ม POST → /topics/[id]/delete */}
                      <Link className="underline mr-3" href={`/topics/${t.id}/edit/assets`}>
                        Manage Assets
                      </Link>
                      <DeleteTopicButton id={t.id} />
                    </>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  No topics
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
