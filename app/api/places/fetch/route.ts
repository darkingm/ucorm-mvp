import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { getServerSupabase } from '@/lib/supabase/server';
import { fetchPlaceWithReviews, type GooglePlace } from '@/lib/google-places';
import { resolvePlaceId } from '@/lib/google-places/resolve';
import { SAMPLE_PLACE } from '@/lib/google-places/sample';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  // 'sample' = dùng seed data, không gọi Google API
  // 'real'   = resolve input → gọi Places API thật
  // bỏ trống = fallback theo USE_SAMPLE_DATA env (giữ backward compat)
  mode: z.enum(['sample', 'real']).optional(),
  input: z.string().trim().min(1).optional(),
});

export async function POST(request: NextRequest) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues.map((i) => i.message).join(', ') : 'Invalid body';
    return Response.json({ error: msg }, { status: 400 });
  }

  const mode: 'sample' | 'real' =
    parsed.mode ?? (env.useSampleData() ? 'sample' : 'real');

  // Sample mode: không cần input thật, dùng ID cố định để re-fetch là upsert chứ không sinh thêm row places.
  // Real mode: bắt buộc input và phải ≥10 ký tự (Place ID ngắn nhất ~27 ký tự, URL còn dài hơn).
  let placeId: string;
  try {
    if (mode === 'sample') {
      placeId = parsed.input?.trim() || SAMPLE_PLACE.id;
    } else {
      const input = parsed.input?.trim();
      if (!input || input.length < 10) {
        return Response.json(
          { error: 'Real mode cần Place ID hoặc URL Google Maps (tối thiểu 10 ký tự)' },
          { status: 400 },
        );
      }
      placeId = await resolvePlaceId(input);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Không resolve được input';
    return Response.json({ error: msg }, { status: 400 });
  }

  let google: GooglePlace;
  try {
    google =
      mode === 'sample'
        ? { ...SAMPLE_PLACE, id: placeId }
        : await fetchPlaceWithReviews(placeId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown upstream error';
    return Response.json({ error: msg }, { status: 502 });
  }

  const supabase = getServerSupabase();

  const { data: place, error: placeErr } = await supabase
    .from('places')
    .upsert(
      {
        place_id: google.id,
        name: google.displayName?.text ?? null,
        address: google.formattedAddress ?? null,
      },
      { onConflict: 'place_id' },
    )
    .select()
    .single();

  if (placeErr || !place) {
    return Response.json({ error: placeErr?.message ?? 'Failed to upsert place' }, { status: 500 });
  }

  const incoming = (google.reviews ?? []).slice(0, 5).map((r) => ({
    place_id: place.id,
    google_review_id: r.name,
    author_name: r.authorAttribution?.displayName ?? null,
    rating: typeof r.rating === 'number' ? r.rating : null,
    comment: r.text?.text ?? r.originalText?.text ?? null,
    review_time: r.publishTime ?? null,
  }));

  let inserted = 0;
  if (incoming.length > 0) {
    const { data, error: revErr } = await supabase
      .from('reviews')
      .upsert(incoming, { onConflict: 'google_review_id', ignoreDuplicates: true })
      .select();

    if (revErr) {
      return Response.json({ error: revErr.message }, { status: 500 });
    }
    inserted = data?.length ?? 0;
  }

  return Response.json({
    mode,
    place,
    resolvedPlaceId: placeId,
    reviewsCount: incoming.length,
    inserted,
  });
}
