'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const SAMPLE_PLACE_ID = 'ChIJN1t_tDeuEmsRUsoyG83frY4';

export function PlaceIdForm() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch('/api/places/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        reviewsCount?: number;
        inserted?: number;
        resolvedPlaceId?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      const idHint = data.resolvedPlaceId ? ` · ${data.resolvedPlaceId}` : '';
      setSuccess(
        `Đã fetch ${data.reviewsCount ?? 0} review (${data.inserted ?? 0} mới)${idHint}`,
      );
      setInput('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Dán Place ID (ChIJ...) hoặc link Google Maps (maps.app.goo.gl/...)"
          required
          minLength={10}
          disabled={loading}
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || input.trim().length < 10}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {loading ? 'Đang fetch…' : 'Fetch'}
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        Hỗ trợ: Place ID, link <code>maps.app.goo.gl/…</code>, <code>goo.gl/maps/…</code>, hoặc URL Google Maps đầy đủ. Thử sample:{' '}
        <button
          type="button"
          onClick={() => setInput(SAMPLE_PLACE_ID)}
          className="font-mono text-zinc-700 underline-offset-2 hover:underline"
        >
          {SAMPLE_PLACE_ID}
        </button>
      </p>
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
      ) : null}
    </form>
  );
}
