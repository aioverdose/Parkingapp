import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config({ path: ".env.production" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!url || !serviceRoleKey || !email || !password) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, and ADMIN_PASSWORD before running bootstrap-admin.");
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: users, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;

let user = users.users.find((candidate) => candidate.email?.toLowerCase() === email);
if (!user) {
  const result = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (result.error || !result.data.user) throw result.error ?? new Error("Admin user was not created");
  user = result.data.user;
} else {
  const result = await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (result.error) throw result.error;
}

const { error: profileError } = await supabase
  .from("users")
  .upsert({ id: user.id, email, name: "Parking Meeters Admin", role: "admin" }, { onConflict: "id" });
if (profileError) throw profileError;

console.log(`Admin account ready: ${email}`);
