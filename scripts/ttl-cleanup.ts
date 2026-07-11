// TTL Cleanup Script — run as a cron job every 5 minutes.
// Usage: npm run ttl-cleanup
// Or deploy as a Supabase cron job via the dashboard:
//   select cron.schedule('ttl-cleanup', '*/5 ...', 'select public.cleanup_ephemeral_chats()');

import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient<Database>(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runCleanup() {
  console.log(`[${new Date().toISOString()}] Running TTL cleanup...`);

  const { error: chatError } = await supabase.rpc("cleanup_ephemeral_chats");
  if (chatError) {
    console.error("cleanup_ephemeral_chats failed:", chatError.message);
  } else {
    console.log("  Ephemeral chats cleaned");
  }

  const { error: pingError } = await supabase.rpc("cleanup_departure_pings");
  if (pingError) {
    console.error("cleanup_departure_pings failed:", pingError.message);
  } else {
    console.log("  Departure pings cleaned");
  }

  const { error: streakError } = await supabase.rpc("maintain_streaks");
  if (streakError) {
    console.error("maintain_streaks failed:", streakError.message);
  } else {
    console.log("  Streaks maintained");
  }

  const now = new Date().toISOString();
  const { data: expiredSpots, error: spotFetchError } = await supabase
    .from("parking_spots")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("expires_at", now)
    .select("id");
  if (spotFetchError) {
    console.error("Expire spots failed:", spotFetchError.message);
  } else {
    console.log(`  ${expiredSpots?.length ?? 0} expired spots marked`);
  }

  console.log("Done.");
}

runCleanup().catch(console.error);
