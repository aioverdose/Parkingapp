import { createAdminClient } from "@/lib/supabaseAdmin";
import { ollamaChat } from "@/lib/ollama";

export async function runSpotPrediction() {
  const supabase = createAdminClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();

  const { data: historicalSpots } = await supabase
    .from("parking_spots")
    .select("latitude, longitude, address, departure_time, created_at")
    .gt("created_at", sevenDaysAgo)
    .limit(500);

  if (!historicalSpots || historicalSpots.length < 5) {
    return { predictions: 0, reason: "Not enough historical data" };
  }

  const dayHourCounts = new Map<string, { lat: number; lng: number; hood: string; count: number }>();

  for (const spot of historicalSpots) {
    const created = new Date(spot.created_at);
    const day = created.toLocaleDateString("en-US", { weekday: "short" });
    const hour = created.getHours();
    const key = `${day}-${hour}`;
    const hood = (spot.address || "").split(",").pop()?.trim() || "Unknown";

    const existing = dayHourCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      dayHourCounts.set(key, {
        lat: spot.latitude,
        lng: spot.longitude,
        hood,
        count: 1,
      });
    }
  }

  const now = new Date();
  const currentDay = now.toLocaleDateString("en-US", { weekday: "short" });
  const currentHour = now.getHours();

  const predictions: { key: string; hood: string; lat: number; lng: number; hour: number }[] = [];

  for (let h = currentHour; h <= currentHour + 2; h++) {
    const key = `${currentDay}-${h}`;
    const entry = dayHourCounts.get(key);
    if (entry && entry.count >= 2) {
      predictions.push({
        key,
        hood: entry.hood,
        lat: entry.lat,
        lng: entry.lng,
        hour: h,
      });
    }
  }

  if (predictions.length === 0) return { predictions: 0 };

  const aiPredictions = await ollamaChat(
    `You are a parking pattern analyst. Based on historical data, predict the best time and area for finding parking spots. Be specific and brief.`,
    predictions.map((p) => `${p.hood} around ${p.hour}:00`).join(", "),
  );

  const { data: nearbyUsers } = await supabase
    .from("users")
    .select("id")
    .limit(50);

  let savedPredictions = 0;

  for (const pred of predictions) {
    await supabase.from("spot_predictions" as any).insert({
      predicted_lat: pred.lat,
      predicted_lng: pred.lng,
      predicted_time: new Date(now.getFullYear(), now.getMonth(), now.getDate(), pred.hour).toISOString(),
      neighborhood: pred.hood,
    });

    const msg =
      aiPredictions ||
      `Spot likely opening near ${pred.hood} around ${pred.hour}:00. Check the map!`;

    for (const user of nearbyUsers || []) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "🔮 Spot Prediction",
        message: msg,
        type: "spot_prediction",
      });
    }

    savedPredictions++;
  }

  return { predictions: savedPredictions };
}
