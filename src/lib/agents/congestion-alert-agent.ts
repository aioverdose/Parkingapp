import { createAdminClient } from "@/lib/supabaseAdmin";
import { ollamaChat } from "@/lib/ollama";

const CONGESTION_WINDOW_MINUTES = 10;
const CONGESTION_THRESHOLD = 10;

export async function runCongestionCheck() {
  const supabase = createAdminClient();

  const tenMinsAgo = new Date(Date.now() - CONGESTION_WINDOW_MINUTES * 60_000).toISOString();

  const { data: recentAlerts } = await supabase
    .from("parking_spots")
    .select("address, created_at, user_id")
    .eq("status", "active")
    .gt("created_at", tenMinsAgo);

  if (!recentAlerts || recentAlerts.length === 0) {
    return { tight_zones: [] };
  }

  const neighborhoodCounts = new Map<string, { count: number; example: string }>();
  for (const alert of recentAlerts) {
    const hood = (alert.address || "Unknown").split(",").pop()?.trim() || "Unknown";
    const prev = neighborhoodCounts.get(hood) || { count: 0, example: alert.address || "" };
    neighborhoodCounts.set(hood, { count: prev.count + 1, example: prev.example });
  }

  const tightZones: { neighborhood: string; count: number }[] = [];
  for (const [neighborhood, { count }] of neighborhoodCounts) {
    if (count >= CONGESTION_THRESHOLD) {
      tightZones.push({ neighborhood, count });
    }
  }

  if (tightZones.length === 0) return { tight_zones: [] };

  for (const zone of tightZones) {
    await (supabase.from("congestion_alerts" as any) as any).insert({
      neighborhood: zone.neighborhood,
      alert_count: zone.count,
    });
  }

  const recommendations = await ollamaChat(
    `You are a parking congestion advisor. Given a tight parking zone, suggest an alternative nearby street or area. Be brief. Max 100 characters.`,
    tightZones.map((z) => `${z.neighborhood} (${z.count} alerts)`).join(", "),
  );

  const { data: activeUsers } = await supabase
    .from("users")
    .select("id")
    .limit(100);

  for (const zone of tightZones) {
    const msg =
      recommendations ||
      `${zone.neighborhood} is tight — consider parking nearby instead.`;

    for (const user of activeUsers || []) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: `⚠️ ${zone.neighborhood} is Tight`,
        message: msg,
        type: "congestion_alert",
      });
    }
  }

  return { tight_zones: tightZones };
}
