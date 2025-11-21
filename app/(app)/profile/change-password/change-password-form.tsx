'use client';

import { FormEvent, useState } from 'react';

type FormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type Message = { type: 'success' | 'error'; text: string };

const initialState: FormState = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function ChangePasswordForm({ minLength }: { minLength: number }) {
  const [form, setForm] = useState<FormState>({ ...initialState });
  const [message, setMessage] = useState<Message | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        const errorMessage = data?.error || 'Unable to change password. Please try again.';
        setMessage({ type: 'error', text: errorMessage });
        return;
      }

      setMessage({ type: 'success', text: 'Password updated. Redirecting to sign-in...' });
      setTimeout(() => {
        window.location.href = '/login?passwordChanged=1';
      }, 1200);
    } catch (error) {
      console.error('Failed to submit change password form', error);
      setMessage({
        type: 'error',
        text: 'A network error occurred. Please check your connection and try again.',
      });
    } finally {
      setSubmitting(false);
      setForm((prev) => ({ ...prev, currentPassword: '' }));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="current-password">
          Current password
        </label>
        <input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          className="w-full rounded border px-3 py-2"
          value={form.currentPassword}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, currentPassword: event.target.value }))
          }
          required
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="new-password">
          New password
        </label>
        <input
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          className="w-full rounded border px-3 py-2"
          value={form.newPassword}
          onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))}
          required
          disabled={submitting}
          minLength={minLength}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="confirm-password">
          Confirm new password
        </label>
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="w-full rounded border px-3 py-2"
          value={form.confirmPassword}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
          }
          required
          disabled={submitting}
          minLength={minLength}
        />
      </div>

      {message && (
        <div
          className={
            message.type === 'success'
              ? 'rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700'
              : 'rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
          }
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded border px-3 py-2 text-sm"
          onClick={() => setForm({ ...initialState })}
          disabled={submitting}
        >
          Reset
        </button>
        <button
          type="submit"
          className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-70"
          disabled={submitting}
        >
          {submitting ? 'Saving...' : 'Save new password'}
        </button>
      </div>
    </form>
  );
}
