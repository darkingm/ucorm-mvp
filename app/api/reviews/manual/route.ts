import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// "place" tổng hợp duy nhất chứa toàn bộ review user paste thủ công.
// Tách khỏi place của TEST / REAL để source badge phân biệt được rõ ràng.
const MANUAL_PLACE_ID = 'manual/inbox';
const MANUAL_PLACE_NAME = 'Reviews thủ công';

const bodySchema = z.object({
  author: z.string().trim().max(100).optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10, 'Review tối thiểu 10 ký tự').max(4000),
  // Optional: nguồn (ví dụ tên khách sạn user copy từ đâu) — chỉ để hiển thị, không index.
  source: z.string().trim().max(200).optional(),
});

export async function POST(request: NextRequest) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues.map((i) => i.message).join(', ') : 'Invalid body';
    return Response.json({ error: msg }, { status: 400 });
  }

  const supabase = getServerSupabase();

  const { data: place, error: placeErr } = await supabase
    .from('places')
    .upsert(
      { place_id: MANUAL_PLACE_ID, name: MANUAL_PLACE_NAME, address: null },
      { onConflict: 'place_id' },
    )
    .select()
    .single();

  if (placeErr || !place) {
    return Response.json({ error: placeErr?.message ?? 'Failed to upsert manual place' }, { status: 500 });
  }

  // Prefix `manual/` để ReviewCard detect bằng google_review_id mà không cần thêm column.
  // Suffix UUID đảm bảo unique kể cả khi user paste cùng comment nhiều lần (test idempotency).
  const reviewId = `manual/${crypto.randomUUID()}`;

  const { data: inserted, error: insertErr } = await supabase
    .from('reviews')
    .insert({
      place_id: place.id,
      google_review_id: reviewId,
      author_name: parsed.author?.trim() || 'Khách',
      rating: parsed.rating,
      // Nếu user điền source, prepend vào comment để hiện thị inline — đỡ phải thêm column DB cho MVP.
      comment: parsed.source
        ? `[Nguồn: ${parsed.source}]\n${parsed.comment}`
        : parsed.comment,
      review_time: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertErr || !inserted) {
    return Response.json({ error: insertErr?.message ?? 'Failed to insert review' }, { status: 500 });
  }

  return Response.json({ review: inserted });
}
