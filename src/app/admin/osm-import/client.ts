import { createBrowserClient } from "@/lib/supabaseClient";

export async function osmImportFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data: { session } } = await createBrowserClient().auth.getSession();
  if (!session?.access_token) throw new Error("An authenticated Supabase session is required");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  return fetch(input, { ...init, headers });
}
