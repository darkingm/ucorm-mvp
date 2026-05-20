import 'server-only';
import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '@/lib/env';
import type { AIReplies } from '@/lib/types';
import { REPLY_SYSTEM_PROMPT, buildUserPrompt } from './prompts';

let cached: OpenAI | null = null;

function client(): OpenAI {
  if (!cached) cached = new OpenAI({ apiKey: env.openaiApiKey() });
  return cached;
}

const repliesSchema = z.object({
  standard: z.string().min(10).max(800),
  friendly: z.string().min(10).max(800),
  apologetic: z.string().min(10).max(800),
});

export async function generateReplies(input: {
  placeName: string | null;
  rating: number | null;
  comment: string | null;
}): Promise<AIReplies> {
  const completion = await client().chat.completions.create(
    {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: REPLY_SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(input) },
      ],
    },
    { signal: AbortSignal.timeout(15_000) },
  );

  const text = completion.choices[0]?.message?.content ?? '';
  if (!text) throw new Error('OpenAI returned empty response');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`OpenAI returned non-JSON: ${text.slice(0, 200)}`);
  }

  return repliesSchema.parse(parsed);
}
