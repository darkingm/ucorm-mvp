'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SampleFetchPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleLoad() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch('/api/places/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'sample' }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        reviewsCount?: number;
        inserted?: number;
      };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setSuccess(
        `Đã nạp ${data.reviewsCount ?? 0} review mẫu (${data.inserted ?? 0} mới).`,
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Không gọi Google API. Dùng để demo full flow Fetch → AI → Approve khi chưa có key.
        Có thể bấm lại nhiều lần (upsert, không sinh trùng).
      </p>
      <button
        type="button"
        onClick={handleLoad}
        disabled={loading}
        className="w-full rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
      >
        {loading ? 'Đang nạp…' : '🧪 Nạp 5 review mẫu'}
      </button>
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
      ) : null}
    </div>
  );
}
