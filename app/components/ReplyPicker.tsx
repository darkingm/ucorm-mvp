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
  // Local state là source of truth cho UI sau action — tránh re-fetch toàn page,
  // tránh scroll jump và layout shift. DB vẫn được cập nhật ngầm bằng router.refresh()
  // chạy background sau khi local state đã set → header badge / counter sync với DB
  // mà view của user không bị nhảy.
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AITone | null>(null);
  const [localReplies, setLocalReplies] = useState<AIReplies | null>(review.ai_replies);
  const [localApproved, setLocalApproved] = useState<{ tone: AITone; reply: string } | null>(
    review.status === 'resolved' && review.approved_reply && review.approved_tone
      ? { tone: review.approved_tone, reply: review.approved_reply }
      : null,
  );

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}/generate`, { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        replies?: AIReplies;
      };
      if (!res.ok || !data.replies) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setLocalReplies(data.replies);
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove() {
    if (!selected || !localReplies) return;
    const reply = localReplies[selected];
    setError(null);
    setApproving(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone: selected, reply }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setLocalApproved({ tone: selected, reply });
      // Background refresh để header badge + counter Pending/Resolved sync.
      // Local state đã giữ view ổn định nên user không thấy scroll jump.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setApproving(false);
    }
  }

  // Đã approve (state hiện tại hoặc state từ DB lúc load) → hiển thị reply, ẩn picker.
  if (localApproved) {
    return (
      <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50/50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
          Reply đã duyệt ({localApproved.tone})
        </p>
        <p className="mt-1 text-sm text-emerald-900">{localApproved.reply}</p>
      </div>
    );
  }

  // Chưa generate → chỉ hiện nút Generate.
  if (!localReplies) {
    return (
      <div className="mt-3 border-t border-zinc-100 pt-3">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          {generating ? 'Đang sinh 3 reply…' : 'Generate AI'}
        </button>
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </div>
    );
  }

  // Đã có replies, chưa approve → hiện 3 card + Approve / Regenerate.
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
                {isSelected ? <span className="text-xs text-zinc-900">✓</span> : null}
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-500">{meta.description}</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-5 text-zinc-700">
                {localReplies[tone]}
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
          {generating ? 'Đang regenerate…' : 'Regenerate'}
        </button>
        <button
          onClick={handleApprove}
          disabled={!selected || approving}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {approving ? 'Đang lưu…' : 'Approve'}
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
