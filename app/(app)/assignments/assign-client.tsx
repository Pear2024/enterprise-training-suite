'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type UserItem = { id: number; username: string; email?: string | null; role: 'ADMIN'|'TRAINER'|'EMPLOYEE' };
type TopicItem = { id: number; code: string; title: string; status?: string };

type PageResp<T> = { items: T[]; page: number; pageSize: number; total: number; totalPages: number };

export default function AssignClient() {
  const router = useRouter();
  const [userQ, setUserQ] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(20);
  const [users, setUsers] = useState<PageResp<UserItem>>({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 });

  const [topicQ, setTopicQ] = useState('');
  const [topicStatus, setTopicStatus] = useState<string>('');
  const [topicPage, setTopicPage] = useState(1);
  const [topicPageSize, setTopicPageSize] = useState(20);
  const [topics, setTopics] = useState<PageResp<TopicItem>>({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 });

  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [dueAt, setDueAt] = useState('');
  const [busy, setBusy] = useState(false);

  // fetchers
  useEffect(() => {
    const ctrl = new AbortController();
    const url = new URL('/api/users', location.origin);
    if (userQ) url.searchParams.set('q', userQ);
    if (userRole) url.searchParams.set('role', userRole);
    url.searchParams.set('page', String(userPage));
    url.searchParams.set('pageSize', String(userPageSize));
    fetch(url.toString(), { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((j) => setUsers(j))
      .catch(() => {});
    return () => ctrl.abort();
  }, [userQ, userRole, userPage, userPageSize]);

  useEffect(() => {
    const ctrl = new AbortController();
    const url = new URL('/api/topics', location.origin);
    if (topicQ) url.searchParams.set('q', topicQ);
    if (topicStatus) url.searchParams.set('status', topicStatus);
    url.searchParams.set('page', String(topicPage));
    url.searchParams.set('pageSize', String(topicPageSize));
    fetch(url.toString(), { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((j) => setTopics(j))
      .catch(() => {});
    return () => ctrl.abort();
  }, [topicQ, topicStatus, topicPage, topicPageSize]);

  const pairs = useMemo(() => selectedUsers.length * selectedTopics.length, [selectedUsers, selectedTopics]);

  async function assign() {
    if (!selectedUsers.length || !selectedTopics.length) {
      alert('Please select at least one user and one topic.');
      return;
    }
    if (pairs > 5000 && !confirm(`Create ${pairs} assignments, Continue?`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUsers, topicIds: selectedTopics, dueAt: dueAt || null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        alert(j?.error || 'Assign failed');
        return;
      }
      const j = await res.json();
      router.push(`/assignments?saved=1&count=${j.count ?? ''}`);
    } finally {
      setBusy(false);
    }
  }

  function toggle<T extends number>(value: T, list: T[], setList: (v: T[]) => void) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  return (
    <section className="rounded-2xl border p-4">
      <h2 className="mb-3 font-semibold">Assign Topic(s) to User(s)</h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Users */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <input placeholder="Search users" className="w-full rounded border px-2 py-1" value={userQ} onChange={(e) => { setUserPage(1); setUserQ(e.target.value); }} />
            <select className="rounded border px-2 py-1" value={userRole} onChange={(e) => { setUserPage(1); setUserRole(e.target.value); }}>
              <option value="">All</option>
              <option value="EMPLOYEE">EMPLOYEE</option>
              <option value="TRAINER">TRAINER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div className="max-h-80 overflow-auto rounded border">
            {users.items.map((u) => (
              <label key={u.id} className="flex cursor-pointer items-center gap-2 border-b px-2 py-1 text-sm">
                <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={() => toggle(u.id, selectedUsers, setSelectedUsers)} />
                <span className="truncate">{u.username} ({u.role})</span>
              </label>
            ))}
            {!users.items.length && <div className="p-2 text-sm text-gray-500">No users</div>}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
            <div>Page {users.page}/{users.totalPages} • {users.total} users</div>
            <div className="flex items-center gap-1">
              <button className="rounded border px-2 py-0.5" onClick={() => setUserPage((p) => Math.max(1, p - 1))}>Prev</button>
              <button className="rounded border px-2 py-0.5" onClick={() => setUserPage((p) => Math.min(users.totalPages, p + 1))}>Next</button>
              <select className="rounded border px-1 py-0.5" value={userPageSize} onChange={(e) => { setUserPage(1); setUserPageSize(Number(e.target.value)); }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Topics */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <input placeholder="Search topics" className="w-full rounded border px-2 py-1" value={topicQ} onChange={(e) => { setTopicPage(1); setTopicQ(e.target.value); }} />
            <select className="rounded border px-2 py-1" value={topicStatus} onChange={(e) => { setTopicPage(1); setTopicStatus(e.target.value); }}>
              <option value="">All</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
          <div className="max-h-80 overflow-auto rounded border">
            {topics.items && (topics.items as any[]).map((t: any) => (
              <label key={t.id} className="flex cursor-pointer items-center gap-2 border-b px-2 py-1 text-sm">
                <input type="checkbox" checked={selectedTopics.includes(t.id)} onChange={() => toggle(t.id, selectedTopics, setSelectedTopics)} />
                <span className="truncate">{t.code} — {t.title}</span>
              </label>
            ))}
            {!topics.items?.length && <div className="p-2 text-sm text-gray-500">No topics</div>}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
            <div>Page {topics.page}/{topics.totalPages} • {topics.total} topics</div>
            <div className="flex items-center gap-1">
              <button className="rounded border px-2 py-0.5" onClick={() => setTopicPage((p) => Math.max(1, p - 1))}>Prev</button>
              <button className="rounded border px-2 py-0.5" onClick={() => setTopicPage((p) => Math.min(topics.totalPages, p + 1))}>Next</button>
              <select className="rounded border px-1 py-0.5" value={topicPageSize} onChange={(e) => { setTopicPage(1); setTopicPageSize(Number(e.target.value)); }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary + Submit */}
        <div>
          <div className="rounded border p-3 text-sm">
            <div className="mb-2 font-medium">Selection</div>
            <div>Users selected: {selectedUsers.length}</div>
            <div>Topics selected: {selectedTopics.length}</div>
            <div className="mt-1 text-xs text-gray-600">Pairs to create: {pairs}</div>
            <div className="mt-3">
              <label className="block text-sm">Due date (optional)
                <input type="date" className="mt-1 w-full rounded border p-2" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button disabled={busy} className="rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-50" onClick={assign}>Assign</button>
              <button className="rounded-xl border px-4 py-2 hover:bg-gray-50" onClick={() => { setSelectedUsers([]); setSelectedTopics([]); }}>Clear</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

