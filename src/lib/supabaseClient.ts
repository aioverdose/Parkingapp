import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let cachedClient: SupabaseClient<Database> | null = null;
let configured = true;

export const isSupabaseConfigured = (): boolean => {
  if (typeof window === "undefined") return true;
  return configured;
};

export const createBrowserClient = (): SupabaseClient<Database> => {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    configured = false;
    cachedClient = createClient<Database>(
      "https://placeholder.supabase.co",
      "placeholder-key",
    );
    return cachedClient;
  }

  configured = true;
  cachedClient = createClient<Database>(url, key);
  return cachedClient;
};
