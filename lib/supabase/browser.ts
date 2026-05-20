'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from '@/lib/types';

let cached: SupabaseClient<Database> | null = null;

export function getBrowserSupabase(): SupabaseClient<Database> {
  if (cached) return cached;
  cached = createClient<Database>(env.supabaseUrl(), env.supabaseAnonKey());
  return cached;
}
