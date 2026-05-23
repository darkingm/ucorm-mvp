'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ManualReviewForm() {
  const router = useRouter();
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch('/api/reviews/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: author.trim() || undefined,
          rating,
          comment: comment.trim(),
          source: source.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setSuccess('Đã thêm review — đang cuộn xuống review mới…');
      setAuthor('');
      setComment('');
      setSource('');
      setRating(5);
      router.refresh();
      // Đợi 1 tick cho router.refresh() bắt đầu re-fetch RSC payload,
      // rồi smooth scroll xuống section list — vì review mới hiện ra bên dưới
      // panel, user không thấy nếu đang focus ở form.
      requestAnimationFrame(() => {
        document
          .getElementById('reviews-section')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="text-xs text-zinc-500">
        Copy review từ Google Maps (mở browser, không gọi API). Paste nội dung vào đây để AI xử lý.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Tên người review (tuỳ chọn)"
          maxLength={100}
          disabled={loading}
          className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none disabled:opacity-50"
        />
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          disabled={loading}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none disabled:opacity-50"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{n} sao</option>
          ))}
        </select>
      </div>
      <input
        type="text"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="Nguồn / tên khách sạn (tuỳ chọn)"
        maxLength={200}
        disabled={loading}
        className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none disabled:opacity-50"
      />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Paste nội dung review vào đây (tối thiểu 10 ký tự)…"
        required
        minLength={10}
        maxLength={4000}
        disabled={loading}
        rows={4}
        className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none disabled:opacity-50"
      />
      {(() => {
        const len = comment.trim().length;
        const needsMore = Math.max(0, 10 - len);
        return (
          <p
            className={`text-xs ${
              len === 0
                ? 'text-zinc-400'
                : needsMore > 0
                  ? 'text-amber-700'
                  : 'text-emerald-700'
            }`}
          >
            {len}/4000 ký tự
            {needsMore > 0
              ? ` — cần thêm ${needsMore} ký tự để bật nút Thêm`
              : ' — đã đủ, có thể bấm Thêm review'}
          </p>
        );
      })()}
      <button
        type="submit"
        disabled={loading || comment.trim().length < 10}
        className="w-full rounded-md border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Đang thêm…' : 'Thêm review'}
      </button>
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
    </form>
  );
}
