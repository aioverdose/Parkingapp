import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient<any> | null = null;
let configured = true;

export const isSupabaseConfigured = (): boolean => {
  if (typeof window === "undefined") return true;
  return configured;
};

export const createBrowserClient = (): SupabaseClient<any> => {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    configured = false;
    cachedClient = createClient<any>(
      "https://placeholder.supabase.co",
      "placeholder-key",
    );
    return cachedClient;
  }

  configured = true;
  cachedClient = createClient<any>(url, key, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return cachedClient;
};
