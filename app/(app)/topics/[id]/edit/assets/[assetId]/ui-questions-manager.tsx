'use client';

import { useState } from 'react';
import type { QuestionType } from '@prisma/client';

type Choice = { id: number; text: string; isCorrect: boolean; order: number };
type Question = { id: number; type: QuestionType; text: string; order: number; points: number; choices: Choice[] };

export default function QuestionsManager({ assetId, initial }: { assetId: number; initial: Question[] }) {
  const [items, setItems] = useState<Question[]>(initial);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ type: QuestionType; text: string; order: number; points: number }>({ type: 'SINGLE_CHOICE', text: '', order: (initial[initial.length - 1]?.order ?? 0) + 1, points: 1 });
  const adjustNumberWidth = (input: HTMLInputElement | null) => {
    if (!input) return;
    const len = input.value.length || 1;
    const widthCh = Math.max(3, len + 1);
    input.style.width = `${widthCh}ch`;
  };

  async function createQuestion() {
    setBusy(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error('Create failed');
      location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function saveQuestion(q: Question) {
    setBusy(true);
    try {
      const res = await fetch(`/api/questions/${q.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: q.type, text: q.text, order: q.order, points: q.points }) });
      if (!res.ok) throw new Error('Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function deleteQuestion(id: number) {
    if (!confirm('Delete this question?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setItems((arr) => arr.filter((x) => x.id !== id));
    } finally {
      setBusy(false);
    }
  }

  async function addChoice(question: Question) {
    const text = prompt('Choice text');
    if (!text) return;
    const cleanText = text.trim();
    if (!cleanText) return;
    const order =
      question.choices.length > 0
        ? Math.max(...question.choices.map((c) => c.order || 0)) + 1
        : 1;
    const isCorrect = confirm('Is this choice correct?');
    const res = await fetch(`/api/questions/${question.id}/choices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, isCorrect, order }),
    });
    if (!res.ok) { alert('Create choice failed'); return; }
    location.reload();
  }

  async function saveChoice(cid: number, patch: Partial<Choice>) {
    const res = await fetch(`/api/choices/${cid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (!res.ok) alert('Update choice failed');
  }

  async function deleteChoice(cid: number) {
    if (!confirm('Delete this choice?')) return;
    const res = await fetch(`/api/choices/${cid}`, { method: 'DELETE' });
    if (!res.ok) alert('Delete choice failed');
    else location.reload();
  }

  function setQ<K extends keyof Question>(idx: number, key: K, val: Question[K]) {
    setItems((arr) => arr.map((q, i) => (i === idx ? { ...q, [key]: val } : q)) as Question[]);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border p-4">
        <h2 className="mb-2 font-semibold">Add Question</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block text-sm">Type
            <select className="mt-1 w-full rounded border p-2" value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as QuestionType }))}>
              {['SINGLE_CHOICE','MULTI_CHOICE','TRUE_FALSE','TEXT'].map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </label>
          <label className="block text-sm">Order
            <input type="number" className="mt-1 w-full rounded border p-2" value={draft.order} onChange={(e) => setDraft((d) => ({ ...d, order: Number(e.target.value) }))} />
          </label>
          <label className="block text-sm">Points
            <input type="number" className="mt-1 w-full rounded border p-2" value={draft.points} onChange={(e) => setDraft((d) => ({ ...d, points: Number(e.target.value) }))} />
          </label>
          <label className="block text-sm md:col-span-2">Text
            <textarea className="mt-1 w-full rounded border p-2" rows={3} value={draft.text} onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))} />
          </label>
        </div>
        <div className="mt-3">
          <button disabled={busy} onClick={createQuestion} className="rounded-xl border px-3 py-1 hover:bg-gray-50 disabled:opacity-50">Create</button>
        </div>
      </section>

      <section className="rounded-2xl border p-4">
        <h2 className="mb-2 font-semibold">Questions</h2>
        <div className="space-y-4">
          {items.map((q, idx) => (
            <div key={q.id} className="rounded-xl border p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block text-sm">Type
                  <select className="mt-1 w-full rounded border p-2" value={q.type} onChange={(e) => setQ(idx, 'type', e.target.value as QuestionType)}>
                    {['SINGLE_CHOICE','MULTI_CHOICE','TRUE_FALSE','TEXT'].map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </label>
                <label className="block text-sm">Order
                  <input type="number" className="mt-1 w-full rounded border p-2" value={q.order} onChange={(e) => setQ(idx, 'order', Number(e.target.value))} />
                </label>
                <label className="block text-sm">Points
                  <input type="number" className="mt-1 w-full rounded border p-2" value={q.points} onChange={(e) => setQ(idx, 'points', Number(e.target.value))} />
                </label>
                <label className="block text-sm md:col-span-2">Text
                  <textarea className="mt-1 w-full rounded border p-2" rows={3} value={q.text} onChange={(e) => setQ(idx, 'text', e.target.value)} />
                </label>
              </div>
              <div className="mt-2 flex gap-2">
                <button disabled={busy} onClick={() => saveQuestion(items[idx])} className="rounded border px-3 py-1 text-sm disabled:opacity-50">Save</button>
                <button disabled={busy} onClick={() => deleteQuestion(q.id)} className="rounded border px-3 py-1 text-sm disabled:opacity-50">Delete</button>
                {(q.type !== 'TEXT') && (
                  <button onClick={() => addChoice(q)} className="rounded border px-3 py-1 text-sm">Add choice</button>
                )}
              </div>
              {(q.type !== 'TEXT') && (
                <div className="mt-3 text-sm">
                  <div className="font-medium mb-1">Choices</div>
                  <ul className="space-y-1">
                    {q.choices.map((c) => (
                      <li key={c.id} className="flex items-center gap-2">
                        <input
                          className="rounded border px-1 py-0.5 text-right"
                          type="number"
                          defaultValue={c.order}
                          ref={adjustNumberWidth}
                          onInput={(e) => adjustNumberWidth(e.currentTarget)}
                          onBlur={(e) => {
                            adjustNumberWidth(e.currentTarget);
                            saveChoice(c.id, { order: Number(e.target.value) });
                          }}
                        />
                        <input className="flex-1 rounded border px-2 py-1" defaultValue={c.text} onBlur={(e) => saveChoice(c.id, { text: e.target.value })} />
                        <label className="inline-flex items-center gap-1">
                          <input type="checkbox" defaultChecked={c.isCorrect} onChange={(e) => saveChoice(c.id, { isCorrect: e.target.checked })} />
                          Correct
                        </label>
                        <button onClick={() => deleteChoice(c.id)} className="rounded border px-2 py-1">Delete</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && <div className="text-sm text-gray-500">No questions</div>}
        </div>
      </section>
    </div>
  );
}
