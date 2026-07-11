import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient<Database>(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { email: "alice@demo.com", password: "demo123456", name: "Alice Chen", vehicle_type: "compact", role: "admin" },
  { email: "bob@demo.com", password: "demo123456", name: "Bob Martinez", vehicle_type: "suv", role: "user" },
  { email: "charlie@demo.com", password: "demo123456", name: "Charlie Rivera", vehicle_type: "truck", role: "user" },
  { email: "diana@demo.com", password: "demo123456", name: "Diana Kim", vehicle_type: "motorcycle", role: "user" },
  { email: "eve@demo.com", password: "demo123456", name: "Eve Thompson", vehicle_type: "sedan", role: "user" },
];

const CHAT_MESSAGES = [
  { from: "claimer", text: "Hey, is your spot still available? I'm right around the corner in a blue SUV." },
  { from: "poster", text: "Yes! I'm about to pull out. It's on the right side, plenty of room for an SUV." },
  { from: "claimer", text: "Perfect, I see it! Thanks so much for sharing." },
  { from: "poster", text: "No problem — pay it forward when you leave!" },
];

const TIP_MESSAGE = "Thanks for the spot, saved me 20min of circling around the block!";

async function findOrCreateUser(profile: typeof USERS[number]) {
  const { data: existing } = await supabase
    .from("users")
    .select("id, vehicle_type, role")
    .eq("email", profile.email)
    .maybeSingle();

  if (existing) {
    const updates: { vehicle_type?: string; role?: string } = {};
    if (existing.vehicle_type !== profile.vehicle_type) updates.vehicle_type = profile.vehicle_type;
    if (existing.role !== profile.role) updates.role = profile.role;
    if (Object.keys(updates).length > 0) {
      await supabase.from("users").update(updates).eq("id", existing.id);
    }
    console.log(`  ${profile.name} (${profile.email})`);
    return { id: existing.id };
  }

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: profile.email,
    password: profile.password,
    email_confirm: true,
    user_metadata: { full_name: profile.name },
  });

  if (userError?.message?.includes?.("already been registered")) {
    // Auth user exists but profile missing — find their ID via auth API
    const { data: users } = await supabase.auth.admin.listUsers();
    const existing = users?.users?.find(u => u.email === profile.email);
    if (!existing) {
      console.error(`  ${profile.email} exists in auth but couldn't find them`);
      return null;
    }
    const { error: profileError } = await supabase.from("users").insert({
      id: existing.id, email: profile.email, name: profile.name,
      vehicle_type: profile.vehicle_type, role: profile.role,
    });
    if (profileError) {
      console.error(`  Failed to insert profile for ${profile.email}:`, profileError.message);
      return null;
    }
    console.log(`  Created missing profile for ${profile.name} (${profile.email})`);
    return { id: existing.id };
  }

  if (userError) {
    console.error(`  Failed to create ${profile.email}:`, userError.message);
    return null;
  }
  if (!userData.user) return null;

  const { error: profileError } = await supabase.from("users").insert({
    id: userData.user.id,
    email: profile.email,
    name: profile.name,
    vehicle_type: profile.vehicle_type,
    role: profile.role,
  });

  if (profileError) {
    console.error(`  Failed to insert ${profile.email}:`, profileError.message);
    return null;
  }

  console.log(`  Created ${profile.name} (${profile.email})`);
  return { id: userData.user.id };
}

async function createSpot(userId: string, lat: number, lng: number, address: string, vehicleType: string | null, minutesFromNow: number) {
  const lead = Math.min(minutesFromNow, 15);
  const expiresAt = new Date(Date.now() + lead * 60000).toISOString();
  const { data, error } = await supabase.from("parking_spots").insert({
    user_id: userId, latitude: lat, longitude: lng, address,
    leaving_at: expiresAt,
    status: "active", vehicle_type: vehicleType ?? null,
    lead_minutes: lead,
    expires_at: expiresAt,
    flag_count: 0,
  }).select().single();

  if (error) { console.error(`  Failed to create spot:`, error.message); return null; }
  return data;
}

async function createChat(spotId: string, senderId: string, receiverId: string) {
  const { data, error } = await supabase.from("ephemeral_chats").insert({
    spot_id: spotId, sender_id: senderId, receiver_id: receiverId,
    status: "active",
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  }).select().single();

  if (error) { console.error(`  Failed to create chat:`, error.message); return null; }
  return data;
}

async function sendMessage(chatId: string, senderId: string, content: string) {
  const { error } = await supabase.from("ephemeral_messages").insert({
    chat_id: chatId, sender_id: senderId, content,
  });
  if (error) console.error(`  Failed to send message:`, error.message);
}

async function claimSpot(spotId: string, claimerId: string) {
  const { error } = await supabase.from("parking_spots").update({ status: "taken" }).eq("id", spotId);
  if (error) { console.error(`  Failed to claim spot:`, error.message); return false; }
  return true;
}

async function closeChat(chatId: string) {
  await supabase.from("ephemeral_chats").update({ status: "completed", closed_at: new Date().toISOString() }).eq("id", chatId);
}

async function sendTip(spotId: string, senderId: string, amount: number, message?: string) {
  const { error } = await supabase.from("tips").insert({ spot_id: spotId, sender_id: senderId, amount, message: message ?? null });
  if (error) { console.error(`  Failed to send tip:`, error.message); return false; }
  return true;
}

async function createNotification(userId: string, title: string, message: string, type: string) {
  await supabase.from("notifications").insert({ user_id: userId, title, message, type });
}

async function createAd(title: string, business: string, tagline: string, linkUrl: string) {
  const { data } = await supabase.from("ads").select("id").eq("business_name", business).maybeSingle();
  if (data) return;
  await supabase.from("ads").insert({
    title, business_name: business, tagline, link_url: linkUrl, active: true,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  console.log(`  Ad created: "${title}"`);
}

async function main() {
  console.log("=== SpotMatch Demo Seed ===\n");
  console.log("Creating users...");

  const users = await Promise.all(USERS.map(findOrCreateUser));
  const activeUsers = users.filter(Boolean) as { id: string }[];
  if (activeUsers.length < 2) { console.error("Need at least 2 users."); process.exit(1); }

  const alice = activeUsers[0];
  const bob = activeUsers[1];
  console.log(`\n${activeUsers.length} users ready.\n`);

  // Clean old demo data
  await supabase.from("parking_spots").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("ephemeral_chats").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("ephemeral_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("tips").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // --- EXCHANGE 1: Alice posts, Bob claims (full lifecycle) ---
  console.log("=== Exchange 1: Alice posts, Bob claims ===");

  // 1. Alice posts a compact-friendly spot
  const spot1 = await createSpot(
    alice.id, 33.7701, -118.1937,
    "100 Aquarium Way, Long Beach, CA",
    "compact", 15,
  );
  if (!spot1) return;

  // 2. Bob finds the spot (via the app) — it fits his SUV (spot is open to all)
  // 3. Bob initiates the handoff: sends a chat message
  const chat1 = await createChat(spot1.id, bob.id, alice.id);
  if (chat1) {
    await sendMessage(chat1.id, bob.id, CHAT_MESSAGES[0].text);
    await sendMessage(chat1.id, alice.id, CHAT_MESSAGES[1].text);
    await sendMessage(chat1.id, bob.id, CHAT_MESSAGES[2].text);
    await sendMessage(chat1.id, alice.id, CHAT_MESSAGES[3].text);
    console.log("  Chat exchange: Bob asked, Alice confirmed, Bob arrived");
  }

  // 4. Bob claims the spot
  await claimSpot(spot1.id, bob.id);
  await createNotification(alice.id, "Spot Claimed!", "Bob claimed your spot at 100 Aquarium Way.", "claim");
  console.log("  Bob claimed the spot");

  // 5. Chat auto-closes on claim (DB trigger)
  if (chat1) {
    await closeChat(chat1.id);
    console.log("  Chat closed after handoff");
  }

  // 6. Bob sends a tip
  await sendTip(spot1.id, bob.id, 2, TIP_MESSAGE);
  await createNotification(alice.id, "New Tip!", "Bob sent you a $2 tip!", "tip");
  console.log("  Bob sent a $2 tip\n");

  // --- EXCHANGE 2: Charlie posts, Diana claims (quick exchange) ---
  console.log("=== Exchange 2: Charlie posts, Diana claims ===");

  const spot2 = await createSpot(
    activeUsers[2].id, 33.7675, -118.1910,
    "154 E 3rd St, Long Beach, CA",
    "motorcycle", 10,
  );
  if (spot2) {
    const chat2 = await createChat(spot2.id, activeUsers[3].id, activeUsers[2].id);
    if (chat2) {
      await sendMessage(chat2.id, activeUsers[3].id, "This spot works for my motorcycle! On my way.");
      await sendMessage(chat2.id, activeUsers[2].id, "All yours, just pulled out. Be careful!");
    }
    await claimSpot(spot2.id, activeUsers[3].id);
    await sendTip(spot2.id, activeUsers[3].id, 1, "Perfect spot for my bike, thanks!");
    if (chat2) await closeChat(chat2.id);
    console.log("  Diana claimed Charlie's spot, sent $1 tip\n");
  }

  // --- Remaining spots: just posted for map visibility ---
  console.log("=== Other active spots for map visibility ===");
  const extraSpots = [
    { user: 4, lat: 33.7725, lng: -118.1955, addr: "4400 E 7th St, Long Beach, CA", vt: "suv", min: 15 },
    { user: 0, lat: 33.7655, lng: -118.1893, addr: "211 E Ocean Blvd, Long Beach, CA", vt: null, min: 10 },
    { user: 1, lat: 33.7750, lng: -118.1980, addr: "4500 E Ocean Blvd, Long Beach, CA", vt: null, min: 15 },
  ];
  for (const s of extraSpots) {
    const spot = await createSpot(activeUsers[s.user].id, s.lat, s.lng, s.addr, s.vt, s.min);
    if (spot) console.log(`  Spot at ${s.addr}`);
  }
  console.log();

  // --- Demo ads ---
  console.log("=== Local advertisements ===");
  await createAd(
    "Downtown Parking Garage — $5 All Day",
    "CityPark Garages",
    "Enter promo PARKSHARE for first visit discount",
    "https://example.com/parking",
  );
  await createAd(
    "Saturday: Shoreline Village Car Show",
    "Long Beach Events",
    "Classic cars, live music, food trucks — noon to 8pm",
    "https://example.com/carshow",
  );
  console.log();

  console.log("=== Seed complete! ===");
  console.log("\nDemo accounts (password: demo123456):");
  for (const u of USERS) {
    const roleTag = u.role === "admin" ? " [admin]" : "";
    console.log(`  ${u.email}  (${u.name}, ${u.vehicle_type})${roleTag}`);
  }
  console.log("\nWhat was seeded:");
  console.log("  • 2 complete spot exchanges (post → chat → claim → tip)");
  console.log("  • 3 active spots on the map");
  console.log("  • 2 local business ads");
  console.log(`  • Alice is an admin — log in as alice@demo.com and visit /admin`);
}

main().catch(console.error);
