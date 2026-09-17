import { type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function getAuthenticatedUser(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // Token validation is server-side only. The service key fallback keeps auth
  // working when deployments expose only the server Supabase credentials.
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

  if (!url || !key) {
    return null;
  }

  const supabase = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const token = request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1].trim();
  if (!token) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return null;
    return data.user;
  } catch {
    return null;
  }
}

/** Create a Supabase client that preserves the caller JWT for auth.uid() in RPCs. */
export function createAuthenticatedSupabaseClient(request: NextRequest) {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  return createClient(url || "https://placeholder.supabase.co", key || "placeholder-key", {
    auth: { autoRefreshToken: false, persistSession: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}
