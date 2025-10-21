'use client';

import { useState } from 'react';
import type { AssetType } from '@prisma/client';

type AssetRow = {
  id: number;
  type: AssetType;
  title: string;
  url: string | null;
  htmlContent: string | null;
  order: number;
  isRequired: boolean;
  durationSec: number | null;
  thumbnailUrl: string | null;
};

export default function AssetsManager({ topicId, initialAssets }: { topicId: number; initialAssets: AssetRow[] }) {
  const [items, setItems] = useState<AssetRow[]>(initialAssets);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Partial<AssetRow> & { type?: AssetType; title?: string }>({
    type: 'VIDEO',
    title: '',
    url: '',
    htmlContent: '',
    isRequired: true,
    order: Math.max(1, (initialAssets[initialAssets.length - 1]?.order ?? 0) + 1),
  });
  const [editId, setEditId] = useState<number | null>(null);

  function onChange<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function create() {
    const title = form.title?.trim();
    if (!title) {
      alert('Title is required.');
      return;
    }

    const needsUrl = form.type && form.type !== 'HTML';
    const urlValue = form.url?.trim();
    if (needsUrl && !urlValue) {
      alert('URL is required for this asset type.');
      return;
    }

    if (form.type === 'HTML' && !(form.htmlContent && form.htmlContent.trim())) {
      alert('HTML content is required when the type is HTML.');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        type: form.type,
        title,
        url: needsUrl ? urlValue : null,
        htmlContent: form.type === 'HTML' ? (form.htmlContent || '') : null,
        order: form.order ?? 1,
        isRequired: !!form.isRequired,
        durationSec: form.durationSec ?? null,
        thumbnailUrl: form.thumbnailUrl?.trim() || null,
      };

      const res = await fetch(`/api/topics/${topicId}/assets/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = data?.error || 'Create failed';
        throw new Error(message);
      }
      location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Create failed';
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  async function update(row: AssetRow) {
    setBusy(true);
    try {
      const res = await fetch(`/api/assets/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      });
      if (!res.ok) throw new Error('Update failed');
      setEditId(null);
      location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this asset?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setItems((it) => it.filter((x) => x.id !== id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border p-4">
        <h2 className="mb-3 font-semibold">Add Asset</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block text-sm">Type
            <select className="mt-1 w-full rounded border p-2" value={form.type}
              onChange={(e) => onChange('type', e.target.value as AssetType)}>
              {['VIDEO','IMAGE','PDF','LINK','HTML'].map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </label>
          <label className="block text-sm">Title
            <input className="mt-1 w-full rounded border p-2" value={form.title || ''}
              onChange={(e) => onChange('title', e.target.value)} />
          </label>
          <label className="block text-sm">URL (VIDEO/PDF/IMAGE/LINK)
            <input className="mt-1 w-full rounded border p-2" value={form.url || ''}
              onChange={(e) => onChange('url', e.target.value)} />
          </label>
          <label className="block text-sm">Order
            <input type="number" className="mt-1 w-full rounded border p-2" value={form.order ?? 1}
              onChange={(e) => onChange('order', Number(e.target.value))} />
          </label>
          <label className="block text-sm md:col-span-2">HTML Content (for HTML type)
            <textarea className="mt-1 w-full rounded border p-2" rows={4} value={form.htmlContent || ''}
              onChange={(e) => onChange('htmlContent', e.target.value)} />
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.isRequired} onChange={(e) => onChange('isRequired', e.target.checked)} />
            Required
          </label>
        </div>
        <div className="mt-3">
          <button disabled={busy} onClick={create} className="rounded-xl border px-3 py-1 hover:bg-gray-50 disabled:opacity-50">Create</button>
        </div>
      </section>

      <section className="rounded-2xl border p-4">
        <h2 className="mb-3 font-semibold">Assets</h2>
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="rounded-xl border p-3">
              {editId === a.id ? (
                <EditRow row={a} busy={busy} onCancel={() => setEditId(null)} onSave={update} />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">#{a.order} [{a.type}] {a.title}</div>
                    <div className="text-gray-500">{a.url || (a.htmlContent ? 'HTML content' : '')}</div>
                    <div className="text-xs">Required: {a.isRequired ? 'Yes' : 'No'}</div>
                  </div>
                  <div className="flex gap-2">
                    <a href={`/topics/${topicId}/edit/assets/${a.id}`} className="rounded border px-2 py-1 text-sm">Manage Questions</a>
                    <button onClick={() => setEditId(a.id)} className="rounded border px-2 py-1 text-sm">Edit</button>
                    <button onClick={() => remove(a.id)} className="rounded border px-2 py-1 text-sm">Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && <div className="text-sm text-gray-500">No assets</div>}
        </div>
      </section>
    </div>
  );
}

function EditRow({ row, busy, onCancel, onSave }: { row: AssetRow; busy: boolean; onCancel: () => void; onSave: (row: AssetRow) => void }) {
  const [draft, setDraft] = useState<AssetRow>({ ...row });
  function set<K extends keyof AssetRow>(k: K, v: AssetRow[K]) { setDraft((d) => ({ ...d, [k]: v })); }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <label className="block text-sm">Type
        <select className="mt-1 w-full rounded border p-2" value={draft.type} onChange={(e) => set('type', e.target.value as AssetType)}>
          {['VIDEO','IMAGE','PDF','LINK','HTML'].map((t) => (<option key={t} value={t}>{t}</option>))}
        </select>
      </label>
      <label className="block text-sm">Title
        <input className="mt-1 w-full rounded border p-2" value={draft.title} onChange={(e) => set('title', e.target.value)} />
      </label>
      <label className="block text-sm">URL
        <input className="mt-1 w-full rounded border p-2" value={draft.url || ''} onChange={(e) => set('url', e.target.value)} />
      </label>
      <label className="block text-sm">Order
        <input type="number" className="mt-1 w-full rounded border p-2" value={draft.order} onChange={(e) => set('order', Number(e.target.value))} />
      </label>
      <label className="block text-sm md:col-span-2">HTML Content
        <textarea className="mt-1 w-full rounded border p-2" rows={4} value={draft.htmlContent || ''} onChange={(e) => set('htmlContent', e.target.value)} />
      </label>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!draft.isRequired} onChange={(e) => set('isRequired', e.target.checked)} /> Required
      </label>
      <div className="mt-2 flex gap-2">
        <button disabled={busy} onClick={() => onSave(draft)} className="rounded border px-3 py-1 disabled:opacity-50">Save</button>
        <button disabled={busy} onClick={onCancel} className="rounded border px-3 py-1 disabled:opacity-50">Cancel</button>
      </div>
    </div>
  );
}
