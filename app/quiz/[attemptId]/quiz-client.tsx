// app/quiz/%5BattemptId%5D/quiz-client.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type QType = 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'TRUE_FALSE' | 'TEXT';
type Choice = { id: number; text: string };
type Question = { id: number; text: string; type: QType; order: number; points: number; choices: Choice[] };

type LoadResp = {
  attemptId: number;
  submitted: boolean;
  questions: Question[];
  answers: { questionId: number; choiceId?: number | null; textAnswer?: string | null }[];
};

export default function QuizClient({ attemptId }: { attemptId: number }) {
  const [data, setData] = useState<LoadResp | null>(null);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/quiz/${attemptId}`, { cache: 'no-store' });
      if (!res.ok) return alert('Unsuccesful to load quiz data');
      const j: LoadResp = await res.json();
      if (j.submitted) {
        router.replace(`/quiz/${attemptId}/result`);
        return;
      }
      setData(j);
    })();
  }, [attemptId, router]);

  const answers = useMemo(() => {
    const map = new Map<number, { choiceIds?: number[]; text?: string }>();
    data?.answers.forEach(a => {
      const prev = map.get(a.questionId) || {};
      if (typeof a.choiceId === 'number') {
        const arr = new Set(prev.choiceIds ?? []);
        arr.add(a.choiceId);
        map.set(a.questionId, { ...prev, choiceIds: Array.from(arr) });
      } else if (typeof a.textAnswer === 'string') {
        map.set(a.questionId, { ...prev, text: a.textAnswer });
      }
    });
    return map;
  }, [data]);

  const [local, setLocal] = useState<Map<number, { choiceIds?: number[]; text?: string }>>(new Map());

  useEffect(() => { if (answers.size) setLocal(new Map(answers)); }, [answers]);

  if (!data) return <main className="p-6">Loading…</main>;

  const qs = data.questions;
  const q = qs[index];

  function toggleChoice(qid: number, cid: number, multi: boolean) {
    setLocal(prev => {
      const now = new Map(prev);
      const it = { ...(now.get(qid) ?? {}) };
      const set = new Set(it.choiceIds ?? []);
      if (multi) {
        set.has(cid) ? set.delete(cid) : set.add(cid);
      } else {
        set.clear(); set.add(cid);
      }
      it.choiceIds = Array.from(set);
      now.set(qid, it);
      return now;
    });
  }

  function setText(qid: number, text: string) {
    setLocal(prev => {
      const now = new Map(prev);
      now.set(qid, { ...(now.get(qid) ?? {}), text });
      return now;
    });
  }

  async function submitAll() {
    setSaving(true);
    try {
      const payload = qs.map(qq => ({
        questionId: qq.id,
        choiceIds: local.get(qq.id)?.choiceIds ?? [],
        textAnswer: local.get(qq.id)?.text ?? null,
      }));
      const res = await fetch(`/api/quiz/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || 'ส่งคำตอบไม่สำเร็จ');
        return;
      }
      router.replace(`/quiz/${attemptId}/result`);
    } finally {
      setSaving(false);
    }
  }

  const multi = q.type === 'MULTI_CHOICE';
  const selected = new Set(local.get(q.id)?.choiceIds ?? []);

  return (
    <main className="min-h-screen p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Question {index + 1} / {qs.length}</div>
        <div className="text-sm text-gray-600">Score for this question: {q.points}</div>
      </div>

      <h2 className="text-lg font-semibold">{q.text}</h2>

      {/* ตัวเลือก / ข้อความ */}
      {['SINGLE_CHOICE','MULTI_CHOICE','TRUE_FALSE'].includes(q.type) && (
        <div className="space-y-2">
          {q.choices.map(c => (
            <label key={c.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type={multi ? 'checkbox' : 'radio'}
                name={`q-${q.id}`}
                checked={selected.has(c.id)}
                onChange={() => toggleChoice(q.id, c.id, multi)}
              />
              <span>{c.text}</span>
            </label>
          ))}
        </div>
      )}

      {q.type === 'TEXT' && (
        <textarea
          className="w-full rounded-lg border p-2"
          rows={5}
          value={local.get(q.id)?.text ?? ''}
          onChange={e => setText(q.id, e.target.value)}
          placeholder="Type your answer here."
        />
      )}

      {/* นำทาง + ส่งคำตอบ */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => setIndex(i => Math.max(0, i - 1))}
          className="rounded-lg border px-4 py-2 disabled:opacity-50"
          disabled={index === 0}
        >
          Before
        </button>
        {index < qs.length - 1 ? (
          <button
            onClick={() => setIndex(i => Math.min(qs.length - 1, i + 1))}
            className="rounded-lg border px-4 py-2"
          >
            Next
          </button>
        ) : (
          <button
            onClick={submitAll}
            disabled={saving}
            className="rounded-lg border px-4 py-2 disabled:opacity-50"
          >
            {saving ? 'Sending…' : 'Submit your answers'}
          </button>
        )}
      </div>
    </main>
  );
}
