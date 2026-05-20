import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  tone: z.enum(['standard', 'friendly', 'apologetic']),
  reply: z.string().trim().min(1).max(2000),
});

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/reviews/[id]/approve'>,
) {
  const { id } = await ctx.params;

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues.map((i) => i.message).join(', ') : 'Invalid body';
    return Response.json({ error: msg }, { status: 400 });
  }

  const supabase = getServerSupabase();

  const { data, error } = await supabase
    .from('reviews')
    .update({
      status: 'resolved',
      approved_reply: parsed.reply,
      approved_tone: parsed.tone,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')         // chống race: chỉ approve được nếu vẫn pending
    .select()
    .single();

  if (error || !data) {
    return Response.json(
      { error: error?.message ?? 'Review không tồn tại hoặc đã resolved' },
      { status: 409 },
    );
  }

  return Response.json({ review: data });
}
