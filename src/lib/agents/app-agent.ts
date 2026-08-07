import { createAdminClient } from "@/lib/supabaseAdmin";
import { chatCompletion, activeProviderName, type LlmMessage } from "@/lib/llm";

export interface AppSnapshot {
  users: number;
  businesses: number;
  networks: number;
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

  const [users, businesses, networks, activeSpots, activeMatches, ads, activeChats, congestionToday, alertsToday, predictionsToday, invitesToday] =
    await Promise.all([
      safe(supabase.from("users").select("*", { count: "exact", head: true })),
      safe(supabase.from("businesses").select("*", { count: "exact", head: true })),
      safe(supabase.from("networks").select("*", { count: "exact", head: true })),
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
    businesses,
    networks,
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

  return `You are the App Agent for SpotMatch, B2B / white-label parking coordination software.
SpotMatch is sold as a subscription to businesses (restaurants, bars, operators) that want to
coordinate parking for their team and neighborhood network. It is NOT a consumer marketplace that
sells, rents, or reserves parking spots — it coordinates who is aware of a spot, one driver at a time.
You help the admin understand and run the platform. You have live access to key metrics.
Answer questions concisely and helpfully. If asked for numbers, use the snapshot provided. If you
don't know something, say so and suggest where to look in the admin or business dashboard.

How networks work:
- A business creates a network (private, just that business) or joins a shared neighborhood group.
- Active members (admin / staff / member) coordinate over spots in that network.
- Matching only ever offers a spot to ONE best-compatible driver at a time, and only within the
  spot's network. No one else is made aware of it.

How matching works (exclusive single-driver model):
- When someone posts a parking spot, it is NOT shown on the public map as a claimable marker.
- A match finder picks exactly one best-compatible seeker based on distance, vehicle type,
  schedule overlap, trust/ranking tier, and reliability (declines / no-shows), skipping blocked users.
- Only that seeker receives an exclusive offer (push + in-app notification) with an acceptance
  window (~90 seconds, configurable via MATCH_OFFER_WINDOW_MS).
- If the seeker declines or the offer times out, the spot is offered to the next-best seeker.
- After a configurable number of exclusive attempts (default 5, per-spot max_exclusive_attempts),
  a consumer spot falls back to a public claimable alert on the map. Network spots NEVER fall
  back to the public map: once their attempts are exhausted, matching simply stops and the spot
  stays private to the network.
- On no-show, the spot is released and re-offered to the next-best seeker; the no-show seeker
  is penalized in future matching.

Current app snapshot (as of ${snapshot.fetchedAt}):
- Total users: ${snapshot.users}
- Subscribing businesses: ${snapshot.businesses}
- Networks: ${snapshot.networks}
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

export async function appAgentReply(messages: LlmMessage[]): Promise<{
  reply: string;
  snapshot: AppSnapshot;
  engine: "ollama" | "openai" | "template";
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

  const reply = await chatCompletion([
    { role: "system", content: buildSystemPrompt(snapshot) },
    ...safeMessages,
  ]);

  const provider = activeProviderName();

  if (reply && reply.trim().length > 0) {
    return { reply: reply.trim(), snapshot, engine: provider === "none" ? "template" : provider };
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

  return `I'm monitoring the platform live. Right now: ${snapshot.users} users across ${snapshot.businesses} subscribing businesses and ${snapshot.networks} networks, ${snapshot.activeSpots} active spots, ${snapshot.activeMatches} active matches, and ${snapshot.ads} ads running. Ask me about users, businesses, spots, matches, ads, congestion, predictions, or invites and I'll pull the numbers.`;
}
