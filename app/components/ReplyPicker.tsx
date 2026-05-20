'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AIReplies, AITone, ReviewWithPlace } from '@/lib/types';

const TONE_META: Record<AITone, { label: string; description: string; accent: string }> = {
  standard: {
    label: 'Tiêu chuẩn',
    description: 'Chuyên nghiệp, lịch sự',
    accent: 'border-zinc-300 hover:border-zinc-500',
  },
  friendly: {
    label: 'Thân thiện',
    description: 'Ấm áp, gần gũi',
    accent: 'border-amber-200 hover:border-amber-400',
  },
  apologetic: {
    label: 'Khắc phục lỗi',
    description: 'Xin lỗi, đề xuất giải pháp',
    accent: 'border-rose-200 hover:border-rose-400',
  },
};

const TONE_ORDER: AITone[] = ['standard', 'friendly', 'apologetic'];

export function ReplyPicker({ review }: { review: ReviewWithPlace }) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AITone | null>(null);

  if (review.status === 'resolved') return null;

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}/generate`, { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove() {
    if (!selected || !review.ai_replies) return;
    setError(null);
    setApproving(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone: selected,
          reply: review.ai_replies[selected],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setApproving(false);
    }
  }

  if (!review.ai_replies) {
    return (
      <div className="mt-3 border-t border-zinc-100 pt-3">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          {generating ? '🤖 Đang sinh 3 reply…' : '🤖 Generate AI'}
        </button>
        {error ? (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        ) : null}
      </div>
    );
  }

  const replies: AIReplies = review.ai_replies;

  return (
    <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Chọn 1 reply để duyệt
      </p>
      <div className="grid gap-2 md:grid-cols-3">
        {TONE_ORDER.map((tone) => {
          const meta = TONE_META[tone];
          const isSelected = selected === tone;
          return (
            <button
              key={tone}
              type="button"
              onClick={() => setSelected(tone)}
              className={`rounded-md border bg-white p-3 text-left text-sm transition ${
                isSelected
                  ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900'
                  : meta.accent
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
                  {meta.label}
                </span>
                {isSelected ? (
                  <span className="text-xs text-zinc-900">✓</span>
                ) : null}
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-500">{meta.description}</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-5 text-zinc-700">
                {replies[tone]}
              </p>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="text-xs text-zinc-500 underline-offset-2 hover:underline disabled:opacity-50"
        >
          {generating ? 'Đang regenerate…' : '↻ Regenerate'}
        </button>
        <button
          onClick={handleApprove}
          disabled={!selected || approving}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {approving ? 'Đang lưu…' : 'Approve'}
        </button>
      </div>
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
