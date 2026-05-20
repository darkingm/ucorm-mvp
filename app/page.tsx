import { getServerSupabase } from '@/lib/supabase/server';
import type { ReviewWithPlace } from '@/lib/types';
import { PlaceIdForm } from './components/PlaceIdForm';
import { ReviewCard } from './components/ReviewCard';
import { SampleFetchPanel } from './components/SampleFetchPanel';

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
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            UCOrm Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Test mode (sample) hoặc Real mode (Google Places) · AI sinh 3 reply · Duyệt 1 trong 3
          </p>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                TEST
              </span>
              <h2 className="text-sm font-medium text-zinc-700">Sample data</h2>
            </div>
            <SampleFetchPanel />
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                REAL
              </span>
              <h2 className="text-sm font-medium text-zinc-700">Google Places API</h2>
            </div>
            <PlaceIdForm />
          </div>
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
              Chưa có review nào. Nạp sample ở bên trái hoặc fetch real ở bên phải để bắt đầu.
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
