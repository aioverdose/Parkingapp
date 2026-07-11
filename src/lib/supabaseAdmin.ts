import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export const createAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return createClient<Database>(
      url ?? "https://placeholder.supabase.co",
      key ?? "placeholder-key",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
