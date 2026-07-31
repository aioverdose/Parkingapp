import { createClient } from "@supabase/supabase-js";

const getUrl = () => (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const getKey = () => (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

export const createAdminClient = () => {
  const url = getUrl();
  const key = getKey();
  if (!url || !key)
    return createClient<any>(
      "https://placeholder.supabase.co",
      "placeholder-key",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  return createClient<any>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};
