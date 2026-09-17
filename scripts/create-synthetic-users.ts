import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const password = process.env.SYNTHETIC_TEST_PASSWORD?.trim() || "test-device-password-2024";

if (!url || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { email: "test-device-1@parkingmeeters.test", username: "test_driver_1", name: "Synthetic Driver 1", phone: "+15550001001", vehicle_type: "sedan", latitude: 33.7701, longitude: -118.1937 },
  { email: "test-device-2@parkingmeeters.test", username: "test_driver_2", name: "Synthetic Driver 2", phone: "+15550001002", vehicle_type: "suv", latitude: 33.7701, longitude: -118.1937 },
  { email: "test-device-3@parkingmeeters.test", username: "test_driver_3", name: "Synthetic Driver 3", phone: "+15550001003", vehicle_type: "compact", latitude: 33.7734, longitude: -118.1852 },
  { email: "test-device-4@parkingmeeters.test", username: "test_driver_4", name: "Synthetic Driver 4", phone: "+15550001004", vehicle_type: "truck", latitude: 33.7628, longitude: -118.1981 },
];

async function main() {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;

  for (const profile of users) {
    let authUser = listed.users.find((user) => user.email?.toLowerCase() === profile.email);
    if (!authUser) {
      const result = await supabase.auth.admin.createUser({
        email: profile.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: profile.name, username: profile.username },
      });
      if (result.error || !result.data.user) throw result.error ?? new Error(`Could not create ${profile.email}`);
      authUser = result.data.user;
    } else {
      const result = await supabase.auth.admin.updateUserById(authUser.id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: profile.name, username: profile.username },
      });
      if (result.error) throw result.error;
    }

    const seekerFixture = profile.username === "test_driver_2";
    const { error: profileError } = await supabase.from("users").upsert({
      id: authUser.id,
      email: profile.email,
      name: profile.name,
      username: profile.username,
      phone_number: profile.phone,
      phone_verified: true,
      phone_verified_at: new Date().toISOString(),
      age_confirmed_at: new Date().toISOString(),
      vehicle_type: profile.vehicle_type,
      schedule_arrival: seekerFixture ? "17:00" : "08:00",
      schedule_departure: seekerFixture ? "08:00" : "17:00",
      schedule_days: [1, 2, 3, 4, 5],
      role: "user",
    }, { onConflict: "id" });
    if (profileError) throw profileError;
    const { data: savedArea } = await supabase.from("user_parking_spots").select("id").eq("user_id", authUser.id).eq("label", "Synthetic primary area").maybeSingle();
    const area = { user_id: authUser.id, label: "Synthetic primary area", latitude: profile.latitude, longitude: profile.longitude, address: "Synthetic Long Beach test area", accuracy: 20, updated_at: new Date().toISOString() };
    if (savedArea) await supabase.from("user_parking_spots").update(area).eq("id", savedArea.id);
    else await supabase.from("user_parking_spots").insert(area);
    const schedule = { user_id: authUser.id, label: "Synthetic test schedule", latitude: profile.latitude, longitude: profile.longitude, days_of_week: [1, 2, 3, 4, 5], departure_time: seekerFixture ? "08:00" : "17:00", return_time: seekerFixture ? "17:00" : "20:00", vehicle_type: profile.vehicle_type, active: true };
    const { data: existingSchedule } = await supabase.from("recurring_schedules").select("id").eq("user_id", authUser.id).eq("label", "Synthetic test schedule").maybeSingle();
    if (existingSchedule) await supabase.from("recurring_schedules").update(schedule).eq("id", existingSchedule.id);
    else await supabase.from("recurring_schedules").insert(schedule);

    console.log(`${profile.email} ready (${profile.username})`);
  }

  console.log(`Synthetic accounts ready. Shared password: ${password}`);
  console.log("These accounts use reserved test email and phone values and never send OTP messages.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
