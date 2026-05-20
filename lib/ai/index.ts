import 'server-only';
import { z } from 'zod';
import { env } from '@/lib/env';
import type { AIReplies } from '@/lib/types';
import { REPLY_SYSTEM_PROMPT, buildUserPrompt } from './prompts';

// Gemini 2.5 Flash — free tier 15 RPM, hỗ trợ JSON mode native qua responseSchema.
// Đổi MODEL nếu cần upgrade chất lượng (gemini-2.5-pro) hoặc giảm cost (gemini-2.0-flash).
const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const repliesSchema = z.object({
  standard: z.string().min(10).max(800),
  friendly: z.string().min(10).max(800),
  apologetic: z.string().min(10).max(800),
});

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  error?: { message?: string; code?: number };
};

export async function generateReplies(input: {
  placeName: string | null;
  rating: number | null;
  comment: string | null;
}): Promise<AIReplies> {
  const url = `${ENDPOINT}?key=${encodeURIComponent(env.geminiApiKey())}`;
  const body = {
    systemInstruction: { parts: [{ text: REPLY_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: buildUserPrompt(input) }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
      // Schema bắt buộc 3 field — Gemini sẽ ép output đúng shape, không cần regex post-process.
      responseSchema: {
        type: 'OBJECT',
        properties: {
          standard: { type: 'STRING' },
          friendly: { type: 'STRING' },
          apologetic: { type: 'STRING' },
        },
        required: ['standard', 'friendly', 'apologetic'],
      },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });

  const data = (await res.json().catch(() => ({}))) as GeminiResponse;

  if (!res.ok) {
    throw new Error(
      `Gemini ${res.status}: ${data.error?.message ?? 'unknown error'}`,
    );
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) {
    const reason = data.candidates?.[0]?.finishReason ?? 'unknown';
    throw new Error(`Gemini trả về rỗng (finishReason=${reason})`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini trả về non-JSON: ${text.slice(0, 200)}`);
  }

  return repliesSchema.parse(parsed);
}
