import { createClient } from "@supabase/supabase-js";

const sup = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data: users } = await sup.from("users").select("id, email, role, name").limit(10);
console.log(JSON.stringify(users, null, 2));
