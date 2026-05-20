import type { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { generateReplies } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  ctx: RouteContext<'/api/reviews/[id]/generate'>,
) {
  const { id } = await ctx.params;
  const supabase = getServerSupabase();

  const { data: review, error: fetchErr } = await supabase
    .from('reviews')
    .select('id, status, comment, rating, places(name)')
    .eq('id', id)
    .single();

  if (fetchErr || !review) {
    return Response.json({ error: fetchErr?.message ?? 'Review not found' }, { status: 404 });
  }

  if (review.status === 'resolved') {
    return Response.json({ error: 'Review đã resolved, không thể generate lại' }, { status: 409 });
  }

  // Supabase's typed `places` relation may surface as object | array depending on FK shape.
  const placeName = Array.isArray(review.places)
    ? review.places[0]?.name ?? null
    : (review.places as { name: string | null } | null)?.name ?? null;

  let replies;
  try {
    replies = await generateReplies({
      placeName,
      rating: review.rating,
      comment: review.comment,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI request failed';
    return Response.json({ error: msg }, { status: 502 });
  }

  const { error: updateErr } = await supabase
    .from('reviews')
    .update({ ai_replies: replies })
    .eq('id', id);

  if (updateErr) {
    return Response.json({ error: updateErr.message }, { status: 500 });
  }

  return Response.json({ replies });
}
