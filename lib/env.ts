function pick(names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.length > 0) return value;
  }
  throw new Error(
    `Missing required environment variable. Set one of: ${names.join(', ')} in .env.local (see .env.example).`,
  );
}

export const env = {
  supabaseUrl: () => pick(['NEXT_PUBLIC_SUPABASE_URL']),

  // Supabase đã đổi naming: "anon key" → "publishable key" (sb_pub_…). Chấp nhận cả 2.
  supabaseAnonKey: () =>
    pick(['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']),

  // "service_role" → "secret key" (sb_secret_…). Chấp nhận cả 2.
  supabaseServiceRoleKey: () =>
    pick(['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY']),

  openaiApiKey: () => pick(['OPENAI_API_KEY']),
  googlePlacesApiKey: () => pick(['GOOGLE_PLACES_API_KEY']),
  useSampleData: () => process.env.USE_SAMPLE_DATA === 'true',
};
