'use client';

import { useState } from 'react';

type FeedbackRange = {
  id: string;
  minCorrect: number;
  message: string;
};

type ConfigPayload = {
  ranges: { minCorrect: number; message: string }[];
};

const DEFAULT_RANGES: FeedbackRange[] = [
  { id: 'default-0', minCorrect: 5, message: 'Excellent understanding of the Code of Ethics.' },
  { id: 'default-1', minCorrect: 3, message: 'Good understanding, review areas of improvement.' },
  { id: 'default-2', minCorrect: 0, message: 'Please review the Code of Ethics and attend additional training.' },
];

export default function FeedbackSettings({
  assetId,
  initialConfig,
}: {
  assetId: number;
  initialConfig: ConfigPayload | null;
}) {
  const initialRanges =
    initialConfig?.ranges?.length
      ? initialConfig.ranges
          .map((entry, index) => ({
            id: `initial-${index}`,
            minCorrect: Math.max(0, Math.floor(entry.minCorrect)),
            message: entry.message ?? '',
          }))
      : DEFAULT_RANGES;

  const [ranges, setRanges] = useState<FeedbackRange[]>(initialRanges);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function updateRange(id: string, changes: Partial<Omit<FeedbackRange, 'id'>>) {
    setRanges((current) =>
      current.map((row) =>
        row.id === id
          ? { ...row, ...changes, minCorrect: changes.minCorrect !== undefined ? Math.max(0, Math.floor(changes.minCorrect)) : row.minCorrect }
          : row,
      ),
    );
  }

  function addRange() {
    const unique = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now().toString(36);
    const nextId = `new-${unique}`;
    setRanges((current) => [...current, { id: nextId, minCorrect: 0, message: '' }]);
  }

  function removeRange(id: string) {
    setRanges((current) => current.filter((row) => row.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      const payload: ConfigPayload = {
        ranges: ranges
          .map((entry) => ({
            minCorrect: Math.max(0, Math.floor(entry.minCorrect)),
            message: entry.message.trim(),
          }))
          .filter((entry) => entry.message.length),
      };

      const res = await fetch(`/api/assets/${assetId}/feedback`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Unable to save feedback configuration');
      }
      setStatus('Saved');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to save feedback configuration');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setRanges(DEFAULT_RANGES);
    setStatus('Reverted to default ranges (remember to Save).');
  }

  async function handleClear() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/assets/${assetId}/feedback`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Unable to clear feedback configuration');
      }
      setRanges(DEFAULT_RANGES);
      setStatus('Cleared custom configuration (using default behaviour).');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to clear feedback configuration');
    } finally {
      setSaving(false);
    }
  }

  const sortedRanges = [...ranges].sort((a, b) => b.minCorrect - a.minCorrect);

  return (
    <section className="space-y-4 rounded-2xl border p-4">
      <header>
        <h2 className="text-lg font-semibold">Feedback rules</h2>
        <p className="text-sm text-gray-600">
          Messages shown on the quiz result page. The first range whose minimum correct answers is met will be used.
        </p>
      </header>

      <div className="space-y-3">
        {sortedRanges.map((range) => (
          <div key={range.id} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[160px_1fr_minmax(80px,auto)]">
            <label className="text-sm">
              Min correct
              <input
                type="number"
                className="mt-1 w-full rounded border px-2 py-1"
                value={range.minCorrect}
                min={0}
                onChange={(event) => updateRange(range.id, { minCorrect: Number(event.target.value) })}
              />
            </label>
            <label className="text-sm md:col-span-1">
              Message
              <input
                className="mt-1 w-full rounded border px-2 py-1"
                value={range.message}
                onChange={(event) => updateRange(range.id, { message: event.target.value })}
                placeholder="Enter feedback message"
              />
            </label>
            <div className="flex items-end justify-end">
              {sortedRanges.length > 1 && (
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-sm hover:bg-gray-50"
                  onClick={() => removeRange(range.id)}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
          onClick={addRange}
          disabled={saving}
        >
          Add range
        </button>
        <button
          type="button"
          className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
          onClick={handleReset}
          disabled={saving}
        >
          Reset to default
        </button>
        <button
          type="button"
          className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
          onClick={handleClear}
          disabled={saving}
        >
          Clear custom rules
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-60"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save rules'}
        </button>
        {status && <span className="text-sm text-gray-600">{status}</span>}
      </div>
    </section>
  );
}
