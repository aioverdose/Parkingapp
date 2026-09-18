import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getClientIp } from "@/lib/api/request-security";
import { sendPushToUser } from "@/lib/push";

const PASSWORD = "test-device-password-2024";
const USERS = [
  { email: "test-device-1@parkingmeeters.test", username: "test_driver_1", name: "Synthetic Driver 1", phone: "+15550001001", vehicle_type: "sedan", latitude: 33.7701, longitude: -118.1937 },
  { email: "test-device-2@parkingmeeters.test", username: "test_driver_2", name: "Synthetic Driver 2", phone: "+15550001002", vehicle_type: "sedan", latitude: 33.7701, longitude: -118.1937 },
  { email: "test-device-3@parkingmeeters.test", username: "test_driver_3", name: "Synthetic Driver 3", phone: "+15550001003", vehicle_type: "sedan", latitude: 33.7734, longitude: -118.1852 },
  { email: "test-device-4@parkingmeeters.test", username: "test_driver_4", name: "Synthetic Driver 4", phone: "+15550001004", vehicle_type: "sedan", latitude: 33.7628, longitude: -118.1981 },
];

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });
  const limit = await checkRateLimit(`synthetic-users:${user.id}:${getClientIp(request)}`, 2, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Synthetic account provisioning is limited to two runs per hour." }, { status: 429 });
  const body = await request.json().catch(() => ({}));

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });
  const accounts = [];

  for (const profileData of USERS) {
    let authUser = listed.users.find((candidate) => candidate.email?.toLowerCase() === profileData.email);
    if (!authUser) {
      const result = await admin.auth.admin.createUser({ email: profileData.email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: profileData.name, username: profileData.username } });
      if (result.error || !result.data.user) return NextResponse.json({ error: result.error?.message || `Could not create ${profileData.email}` }, { status: 500 });
      authUser = result.data.user;
    } else {
      const result = await admin.auth.admin.updateUserById(authUser.id, { password: PASSWORD, email_confirm: true, user_metadata: { full_name: profileData.name, username: profileData.username } });
      if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    const seekerFixture = profileData.username === "test_driver_2";
    const { data: existingProfile } = await admin.from("users").select("id").eq("id", authUser.id).maybeSingle();
    const shouldSeedProfile = body.action !== "create_test_match" || !existingProfile;
    if (shouldSeedProfile) {
      const { error: profileError } = await admin.from("users").upsert({ id: authUser.id, email: profileData.email, name: profileData.name, username: profileData.username, phone_number: profileData.phone, phone_verified: true, phone_verified_at: new Date().toISOString(), age_confirmed_at: new Date().toISOString(), vehicle_type: profileData.vehicle_type, schedule_arrival: seekerFixture ? "17:00" : "08:00", schedule_departure: seekerFixture ? "08:00" : "17:00", schedule_days: [1, 2, 3, 4, 5], match_credits: 5, role: "user" }, { onConflict: "id" });
      if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    if (!shouldSeedProfile) {
      accounts.push({ email: profileData.email, username: profileData.username, vehicle_type: profileData.vehicle_type });
      continue;
    }
    const { data: savedArea } = await admin.from("user_parking_spots").select("id").eq("user_id", authUser.id).eq("label", "Synthetic primary area").maybeSingle();
    const area = { user_id: authUser.id, label: "Synthetic primary area", latitude: profileData.latitude, longitude: profileData.longitude, address: "Synthetic Long Beach test area", accuracy: 20, updated_at: new Date().toISOString() };
    if (savedArea) await admin.from("user_parking_spots").update(area).eq("id", savedArea.id);
    else await admin.from("user_parking_spots").insert(area);
    const schedule = { user_id: authUser.id, label: "Synthetic test schedule", latitude: profileData.latitude, longitude: profileData.longitude, days_of_week: [1, 2, 3, 4, 5], departure_time: seekerFixture ? "08:00" : "17:00", return_time: seekerFixture ? "17:00" : "20:00", vehicle_type: profileData.vehicle_type, active: true };
    const { data: existingSchedule } = await admin.from("recurring_schedules").select("id").eq("user_id", authUser.id).eq("label", "Synthetic test schedule").maybeSingle();
    if (existingSchedule) await admin.from("recurring_schedules").update(schedule).eq("id", existingSchedule.id);
    else await admin.from("recurring_schedules").insert(schedule);
    accounts.push({ email: profileData.email, username: profileData.username, vehicle_type: profileData.vehicle_type });
  }

  if (body.action === "create_test_match" || body.action === "simulate_messaging") {
    const owner = await admin.from("users").select("id, email, name, vehicle_type").eq("email", USERS[0].email).maybeSingle();
    const seeker = await admin.from("users").select("id, email, name, vehicle_type").eq("email", USERS[1].email).maybeSingle();
    if (!owner.data?.id || !seeker.data?.id) return NextResponse.json({ error: "Provision synthetic users first" }, { status: 400 });
    const departure = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const { data: existingMatch } = body.action === "simulate_messaging"
      ? await admin.from("spot_matches").select("id, spot_id, status").eq("spot_owner_id", owner.data.id).eq("seeker_id", seeker.data.id).in("status", ["pending", "offered", "confirmed_by_owner", "confirmed_by_seeker", "confirmed"]).maybeSingle()
      : { data: null };
    let spotId = existingMatch?.spot_id ?? "";
    let matchId = existingMatch?.id ?? "";
    if (existingMatch && existingMatch.status !== "confirmed") await admin.from("spot_matches").update({ status: "confirmed" }).eq("id", existingMatch.id);
    const { data: spot, error: spotError } = spotId ? { data: { id: spotId }, error: null } : await admin.from("parking_spots").insert({ user_id: owner.data.id, latitude: 33.7701, longitude: -118.1937, address: "Synthetic test exchange area", departure_time: departure, return_time: expires, status: "active", vehicle_type: owner.data.vehicle_type, expires_at: expires, relay_mode: "imminent", visibility: "public", exclusive_attempts: 0, max_exclusive_attempts: 5 }).select("id").single();
    if (spotError || !spot) return NextResponse.json({ error: spotError?.message || "Could not create test departure" }, { status: 500 });
    spotId = spot.id;
    const { data: match, error: matchError } = matchId ? { data: { id: matchId }, error: null } : await admin.from("spot_matches").insert({ spot_id: spotId, spot_owner_id: owner.data.id, seeker_id: seeker.data.id, status: body.action === "simulate_messaging" ? "confirmed" : "pending", business_id: null, network_id: null }).select("id").single();
    if (matchError || !match) return NextResponse.json({ error: matchError?.message || "Could not create test match" }, { status: 500 });
    matchId = match.id;
    if (body.action === "simulate_messaging") {
      const { data: existingChat } = await admin.from("ephemeral_chats").select("id").eq("spot_id", spotId).eq("sender_id", owner.data.id).eq("receiver_id", seeker.data.id).eq("status", "active").maybeSingle();
      let chatId = existingChat?.id;
      if (!chatId) {
        const { data: chat, error: chatError } = await admin.from("ephemeral_chats").insert({ spot_id: spotId, sender_id: owner.data.id, receiver_id: seeker.data.id, status: "active", expires_at: expires }).select("id").single();
        if (chatError || !chat) return NextResponse.json({ error: chatError?.message || "Could not create simulated conversation" }, { status: 500 });
        chatId = chat.id;
      }
      const { count } = await admin.from("ephemeral_messages").select("id", { count: "exact", head: true }).eq("chat_id", chatId);
      if (!count) await admin.from("ephemeral_messages").insert([{ chat_id: chatId, sender_id: owner.data.id, content: "Simulation: I am pulling out in about 30 minutes." }, { chat_id: chatId, sender_id: seeker.data.id, content: "Simulation: Thanks, I will be ready for the handoff." }]);
      return NextResponse.json({ accounts, password: PASSWORD, testMessaging: { matchId, chatId, ownerEmail: owner.data.email, seekerEmail: seeker.data.email, adminMessengerUrl: `/admin/messenger?search=${encodeURIComponent(chatId)}` }, message: "Simulated match confirmed and messaging conversation created." });
    }
    await admin.from("notifications").insert([
      { user_id: owner.data.id, type: "match", title: "Match found!", message: "A driver with a matching schedule wants your spot. Review and accept to coordinate.", match_id: match.id },
      { user_id: seeker.data.id, type: "match", title: "Match found!", message: "A compatible departure signal is ready for your review.", match_id: match.id },
    ]);
    const [ownerPush, seekerPush] = await Promise.all([
      sendPushToUser(owner.data.id, { type: "match_found", title: "Match found!", body: "A driver with a matching schedule wants your spot. Review and accept to coordinate.", match_id: match.id }),
      sendPushToUser(seeker.data.id, { type: "match_found", title: "Match found!", body: "A compatible departure signal is ready for your review.", match_id: match.id }),
    ]);
    return NextResponse.json({ accounts, password: PASSWORD, testMatch: { matchId: match.id, ownerEmail: owner.data.email, seekerEmail: seeker.data.email }, push: { sent: ownerPush.sent + seekerPush.sent, failed: ownerPush.failed + seekerPush.failed }, message: "Synthetic users, notifications, push attempt, and a pending test match are ready. Both users must accept before chat opens." });
  }

  return NextResponse.json({ accounts, password: PASSWORD, message: "Synthetic accounts are ready. They bypass SMS only because they use reserved test identities." });
}
