import { createAdminClient } from "@/lib/supabaseAdmin";
import { ollamaChat } from "@/lib/ollama";

const DEMAND_RADIUS_METERS = 161; // ~0.1 mile

interface NewSpot {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  departure_time: string;
  address: string;
  vehicle_type: string | null;
}

interface NearbySeeker {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  vehicle_type: string | null;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dlat = toRad(lat2 - lat1);
  const dlng = toRad(lng2 - lng1);
  const a =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatLeavingTime(leavingAt: string): string {
  const diff = new Date(leavingAt).getTime() - Date.now();
  const mins = Math.floor(diff / 60000);
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins} minutes`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `in ${h}h ${m}m` : `in ${h} hours`;
}

export async function runDemandMatch(spot: NewSpot) {
  const supabase = createAdminClient();

  const { data: seekers } = await supabase
    .from("spot_requests")
    .select("id, user_id, latitude, longitude, vehicle_type")
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());

  if (!seekers || seekers.length === 0) return { matched: 0 };

  const nearby: NearbySeeker[] = [];
  for (const s of seekers) {
    const dist = haversineDistance(spot.latitude, spot.longitude, s.latitude, s.longitude);
    if (dist <= DEMAND_RADIUS_METERS) {
      nearby.push(s);
    }
  }

  if (nearby.length === 0) return { matched: 0 };

  const leavingStr = formatLeavingTime(spot.departure_time);

  const aiMessage = await ollamaChat(
    `You are a parking spot matching assistant. A spot just opened. Write a brief, friendly push notification message for nearby drivers who are looking for parking. Include the address and time. Max 150 characters.`,
    `Spot at ${spot.address}, leaving ${leavingStr}.`,
  );

  const notificationMessage =
    aiMessage ||
    `Spot opening ${leavingStr} at ${spot.address || "nearby"}! Check it now.`;

  for (const seeker of nearby) {
    await supabase.from("notifications").insert({
      user_id: seeker.user_id,
      title: "Spot Found for You!",
      message: notificationMessage,
      type: "demand_match",
    });
  }

  return { matched: nearby.length };
}
