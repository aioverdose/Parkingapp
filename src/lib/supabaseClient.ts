import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;
let configured = true;

export const isSupabaseConfigured = (): boolean => {
  if (typeof window === "undefined") return true;
  return configured;
};

export const createBrowserClient = (): SupabaseClient => {
  if (cachedClient) return cachedClient;

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  const validUrl = /^https:\/\/[^\s/]+(?:\/.*)?$/.test(url);

  if (!validUrl || !key) {
    configured = false;
    cachedClient = createClient(
      "https://placeholder.supabase.co",
      "placeholder-key",
    );
    return cachedClient;
  }

  configured = true;
  cachedClient = createClient(url, key, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return cachedClient;
};
