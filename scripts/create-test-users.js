#!/usr/bin/env node
/**
 * Creates 4 test users in Supabase Auth + inserts their profiles.
 *
 * Usage:
 *   node scripts/create-test-users.js
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL  (e.g. https://xyz.supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY  (from Settings → API → service_role)
 */

const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { email: "test-device-1@parkingmeeters.test", label: "Device 1", vehicleType: "sedan" },
  { email: "test-device-2@parkingmeeters.test", label: "Device 2", vehicleType: "suv" },
  { email: "test-device-3@parkingmeeters.test", label: "Device 3", vehicleType: "compact" },
  { email: "test-device-4@parkingmeeters.test", label: "Device 4", vehicleType: "truck" },
];
const PASSWORD = "test-device-password-2024";

async function main() {
  const created = [];

  for (const u of USERS) {
    // Check if user already exists by listing and filtering
    const { data: existing } = await supabase.auth.admin.listUsers({ filter: u.email });
    if (existing?.users?.length > 0) {
      console.log(`  Already exists: ${u.email} (${existing.users[0].id})`);
      created.push({ ...u, id: existing.users[0].id });
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error(`  Failed to create ${u.email}: ${error.message}`);
      continue;
    }
    console.log(`  Created: ${u.email} (${data.user.id})`);
    created.push({ ...u, id: data.user.id });
  }

  // Insert profiles into public.users
  const profiles = created.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.label,
    vehicle_type: u.vehicleType,
    role: "user",
  }));

  const { error: profileError } = await supabase
    .from("users")
    .upsert(profiles, { onConflict: "id" });

  if (profileError) {
    console.error("Failed to insert profiles:", profileError.message);
  } else {
    console.log(`\nInserted ${profiles.length} profiles into public.users`);
  }

  // Print the constant IDs so you can update src/lib/testing/constants.ts
  console.log("\n--- Update src/lib/testing/constants.ts with these UUIDs ---");
  for (const u of created) {
    console.log(`  ${u.label}: "${u.id}"`);
  }
}

main().catch(console.error);
