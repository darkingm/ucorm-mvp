import { getServerSupabase } from '@/lib/supabase/server';
import type { ReviewWithPlace } from '@/lib/types';
import { PlaceIdForm } from './components/PlaceIdForm';
import { ReviewCard } from './components/ReviewCard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = getServerSupabase();

  const { data, error } = await supabase
    .from('reviews')
    .select('*, places(name, place_id, address)')
    .order('created_at', { ascending: false });

  const reviews = (data ?? []) as ReviewWithPlace[];
  const pending = reviews.filter((r) => r.status === 'pending').length;
  const resolved = reviews.filter((r) => r.status === 'resolved').length;

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            UCOrm Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Nhập Google Place ID để fetch review · AI sinh 3 reply · Duyệt 1 trong 3
          </p>
        </header>

        <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-zinc-700">
            Fetch reviews từ Google Maps
          </h2>
          <PlaceIdForm />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-700">
              Tất cả review ({reviews.length})
            </h2>
            <div className="flex gap-3 text-xs text-zinc-500">
              <span>
                Pending: <strong className="text-amber-700">{pending}</strong>
              </span>
              <span>
                Resolved: <strong className="text-emerald-700">{resolved}</strong>
              </span>
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Lỗi đọc DB: {error.message}
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
              Chưa có review nào. Fetch một Place ID ở trên để bắt đầu.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
