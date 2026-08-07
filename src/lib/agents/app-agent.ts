import { createAdminClient } from "@/lib/supabaseAdmin";
import { ollamaChatMessages, type OllamaMessage } from "@/lib/ollama";

export interface AppSnapshot {
  users: number;
  activeSpots: number;
  activeMatches: number;
  ads: number;
  activeChats: number;
  congestionToday: number;
  alertsToday: number;
  predictionsToday: number;
  invitesToday: number;
  topNeighborhoods: { name: string; count: number }[];
  fetchedAt: string;
}

export async function getAppSnapshot(): Promise<AppSnapshot> {
  const supabase = createAdminClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const safe = async (p: unknown): Promise<number> => {
    try {
      const r = await p;
      const count = (r as { count?: number | null }).count;
      return count ?? 0;
    } catch {
      return 0;
    }
  };

  const [users, activeSpots, activeMatches, ads, activeChats, congestionToday, alertsToday, predictionsToday, invitesToday] =
    await Promise.all([
      safe(supabase.from("users").select("*", { count: "exact", head: true })),
      safe(supabase.from("parking_spots").select("*", { count: "exact", head: true }).eq("status", "active")),
      safe(supabase.from("spot_matches").select("*", { count: "exact", head: true }).eq("status", "active")),
      safe(supabase.from("ads").select("*", { count: "exact", head: true }).eq("active", true)),
      safe(supabase.from("ephemeral_chats").select("*", { count: "exact", head: true }).eq("status", "active")),
      safe(supabase.from("congestion_alerts").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString())),
      safe(supabase.from("parking_spots").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString())),
      safe(supabase.from("spot_predictions").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString())),
      safe(supabase.from("invite_conversions").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString())),
    ]);

  let topNeighborhoods: AppSnapshot["topNeighborhoods"] = [];
  try {
    const { data } = await supabase
      .from("parking_spots")
      .select("address")
      .eq("status", "active")
      .gte("created_at", todayStart.toISOString());
    const map = new Map<string, number>();
    for (const row of (data || [])) {
      const hood = (row.address || "").split(",").pop()?.trim() || "Unknown";
      map.set(hood, (map.get(hood) || 0) + 1);
    }
    topNeighborhoods = [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  } catch {
    // ignore
  }

  return {
    users,
    activeSpots,
    activeMatches,
    ads,
    activeChats,
    congestionToday,
    alertsToday,
    predictionsToday,
    invitesToday,
    topNeighborhoods,
    fetchedAt: new Date().toISOString(),
  };
}

function buildSystemPrompt(snapshot: AppSnapshot): string {
  const hoods =
    snapshot.topNeighborhoods.length > 0
      ? snapshot.topNeighborhoods.map((h) => `${h.name} (${h.count})`).join(", ")
      : "n/a";

  return `You are the App Agent for Parking Meeters, a peer-to-peer parking spot sharing app.
You help the admin understand and run the app. You have live access to the app's key metrics.
Answer questions concisely and helpfully. If asked for numbers, use the snapshot provided. If you
don't know something, say so and suggest where to look in the admin dashboard.

Current app snapshot (as of ${snapshot.fetchedAt}):
- Total users: ${snapshot.users}
- Active parking spots: ${snapshot.activeSpots}
- Active matches: ${snapshot.activeMatches}
- Active ad campaigns: ${snapshot.ads}
- Active chats: ${snapshot.activeChats}
- Alerts today: ${snapshot.alertsToday}
- Congestion alerts today: ${snapshot.congestionToday}
- Spot predictions today: ${snapshot.predictionsToday}
- Invites today: ${snapshot.invitesToday}
- Top neighborhoods today: ${hoods}`;
}

export async function appAgentReply(messages: OllamaMessage[]): Promise<{
  reply: string;
  snapshot: AppSnapshot;
  engine: "ollama" | "template";
}> {
  const snapshot = await getAppSnapshot();

  const safeMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .filter((m) => m.content && m.content.trim().length > 0)
    .slice(-20);

  const lastUser = [...safeMessages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return {
      reply: "I need a question or instruction to help you.",
      snapshot,
      engine: "template",
    };
  }

  const reply = await ollamaChatMessages([
    { role: "system", content: buildSystemPrompt(snapshot) },
    ...safeMessages,
  ]);

  if (reply && reply.trim().length > 0) {
    return { reply: reply.trim(), snapshot, engine: "ollama" };
  }

  return {
    reply: templateReply(lastUser.content, snapshot),
    snapshot,
    engine: "template",
  };
}

function templateReply(prompt: string, snapshot: AppSnapshot): string {
  const lower = prompt.toLowerCase();

  if (/(how many|count|number of).*(user|member)/.test(lower)) {
    return `There are currently ${snapshot.users} total users. New signups and device activity are visible under Users in the admin dashboard.`;
  }
  if (/(how many|count|number of).*(spot|parking)/.test(lower)) {
    return `There are ${snapshot.activeSpots} active parking spots right now (${snapshot.alertsToday} posted today). The busiest neighborhoods today: ${
      snapshot.topNeighborhoods.map((h) => `${h.name} (${h.count})`).join(", ") || "none yet"
    }.`;
  }
  if (/(how many|count|number of).*(match)/.test(lower)) {
    return `There are ${snapshot.activeMatches} active matches being facilitated right now.`;
  }
  if (/congest/.test(lower)) {
    return `Today there have been ${snapshot.congestionToday} congestion alerts. Active spots today: ${snapshot.alertsToday}.`;
  }
  if (/prediction/.test(lower)) {
    return `The spot prediction agent has generated ${snapshot.predictionsToday} predictions today. Check the Test Suite to run it manually.`;
  }
  if (/invite/.test(lower)) {
    return `There have been ${snapshot.invitesToday} invites sent today.`;
  }
  if (/ad|advertis/.test(lower)) {
    return `There are ${snapshot.ads} active ad campaigns. Full performance (impressions, clicks, CTR) is on the main dashboard and Ad Campaigns page.`;
  }

  return `I'm monitoring the app live. Right now: ${snapshot.users} users, ${snapshot.activeSpots} active spots, ${snapshot.activeMatches} active matches, and ${snapshot.ads} ads running. Ask me about users, spots, matches, ads, congestion, predictions, or invites and I'll pull the numbers.`;
}
