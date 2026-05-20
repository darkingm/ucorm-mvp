import type { ReviewWithPlace } from '@/lib/types';

function Stars({ rating }: { rating: number | null }) {
  if (rating === null) return null;
  return (
    <span className="text-amber-500" aria-label={`${rating} sao`}>
      {'★'.repeat(rating)}
      <span className="text-zinc-300">{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'resolved' }) {
  const styles =
    status === 'resolved'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : 'bg-amber-50 text-amber-700 ring-amber-200';
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${styles}`}
    >
      {status === 'resolved' ? 'Resolved' : 'Pending'}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function ReviewCard({ review }: { review: ReviewWithPlace }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-900">
            {review.author_name ?? 'Khách'}
          </span>
          <Stars rating={review.rating} />
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>{formatDate(review.review_time)}</span>
          <StatusBadge status={review.status} />
        </div>
      </header>

      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-700">
        {review.comment ?? <em className="text-zinc-400">(no comment)</em>}
      </p>

      {review.places ? (
        <footer className="mt-3 border-t border-zinc-100 pt-2 text-xs text-zinc-500">
          <span className="font-medium text-zinc-600">{review.places.name}</span>
          {review.places.address ? ` • ${review.places.address}` : null}
        </footer>
      ) : null}

      {review.status === 'resolved' && review.approved_reply ? (
        <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50/50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Reply đã duyệt{' '}
            {review.approved_tone ? `(${review.approved_tone})` : ''}
          </p>
          <p className="mt-1 text-sm text-emerald-900">{review.approved_reply}</p>
        </div>
      ) : null}
    </article>
  );
}
