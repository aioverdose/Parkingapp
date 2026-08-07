import { createAdminClient } from "@/lib/supabaseAdmin";
import { sendPushToUser } from "@/lib/push";

const DEFAULT_MATCH_RADIUS_METERS = 200;
const DEFAULT_OFFER_WINDOW_MS = 90_000;

export interface ExclusiveSpot {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  departure_time: string;
  return_time: string | null;
  address: string | null;
  vehicle_type: string | null;
  relay_mode: "imminent" | "scheduled";
  visibility: "exclusive" | "public";
  exclusive_attempts: number;
  max_exclusive_attempts: number;
}

interface SeekCandidate {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  vehicle_type: string | null;
  created_at: string;
}

export interface SeekCandidateScored extends SeekCandidate {
  distance: number;
  score: number;
}

export function getOfferWindowMs(): number {
  const raw = Number(process.env.MATCH_OFFER_WINDOW_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_OFFER_WINDOW_MS;
}

export function getMatchRadiusMeters(): number {
  const raw = Number(process.env.MATCH_RADIUS_METERS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MATCH_RADIUS_METERS;
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function schedulesOverlap(
  spotDeparture: string,
  spotReturn: string | null,
  seekerDesiredFrom: string,
  seekerDesiredTo: string,
): boolean {
  const sd = new Date(spotDeparture).getTime();
  const sr = spotReturn ? new Date(spotReturn).getTime() : sd + 2 * 60 * 60 * 1000;
  const sf = new Date(seekerDesiredFrom).getTime();
  const st = new Date(seekerDesiredTo).getTime();
  return sf < sr && st > sd;
}

export function isScheduleCompatible(spot: ExclusiveSpot, req: SeekCandidate): boolean {
  let seekerFrom: string;
  let seekerTo: string;

  if (spot.relay_mode === "scheduled") {
    const depTime = new Date(spot.departure_time).getTime();
    const retTime = spot.return_time
      ? new Date(spot.return_time).getTime()
      : depTime + 2 * 60 * 60 * 1000;
    seekerFrom = new Date(req.created_at).toISOString();
    seekerTo = new Date(retTime).toISOString();
  } else {
    seekerFrom = new Date(req.created_at).toISOString();
    seekerTo = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  }

  return schedulesOverlap(spot.departure_time, spot.return_time, seekerFrom, seekerTo);
}

export async function incrementReliabilityCounter(
  userId: string,
  column: "decline_count" | "no_show_count",
): Promise<void> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select(column)
    .eq("id", userId)
    .single();
  const current = ((data as Record<string, number> | null)?.[column] ?? 0) + 1;
  await supabase
    .from("users")
    .update({ [column]: current })
    .eq("id", userId);
}

/**
 * Finds the single best-compatible seeker for a spot.
 * Considers distance, vehicle type, schedule overlap, block state, trust/ranking
 * and seeker reliability (declines / no-shows). Returns null when no compatible
 * seeker exists.
 */
export async function findBestSeeker(
  spot: ExclusiveSpot,
  excludeSeekerIds: string[] = [],
): Promise<SeekCandidateScored | null> {
  const supabase = createAdminClient();
  const radiusMeters = getMatchRadiusMeters();

  const { data: requests } = await supabase
    .from("spot_requests")
    .select("id, user_id, latitude, longitude, vehicle_type, created_at")
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());

  if (!requests || requests.length === 0) return null;

  const excluded = new Set(excludeSeekerIds);
  const candidates: SeekCandidateScored[] = [];

  for (const req of requests as SeekCandidate[]) {
    if (req.user_id === spot.user_id) continue;
    if (excluded.has(req.user_id)) continue;

    const distance = haversineDistance(spot.latitude, spot.longitude, req.latitude, req.longitude);
    if (distance > radiusMeters) continue;

    if (spot.vehicle_type && req.vehicle_type && spot.vehicle_type !== req.vehicle_type) continue;
    if (!isScheduleCompatible(spot, req)) continue;

    candidates.push({ ...req, distance: Math.round(distance), score: 0 });
  }

  if (candidates.length === 0) return null;

  const seekerIds = candidates.map((c) => c.user_id);

  const [rankRes, usersRes, blockRes] = await Promise.all([
    supabase
      .from("user_ranking")
      .select("user_id, trust_score, rank_tier, rank_points, successful_handoffs, flags_received")
      .in("user_id", seekerIds),
    supabase
      .from("users")
      .select("id, decline_count, no_show_count")
      .in("id", seekerIds),
    supabase
      .from("user_blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${spot.user_id},blocked_id.eq.${spot.user_id}`),
  ]);

  const rankMap = new Map<string, { trust_score: number; rank_tier: string; rank_points: number; successful_handoffs: number; flags_received: number }>();
  for (const row of (rankRes.data ?? []) as Array<{ user_id: string; trust_score: number; rank_tier: string; rank_points: number; successful_handoffs: number; flags_received: number }>) {
    rankMap.set(row.user_id, row);
  }

  const userMap = new Map<string, { decline_count: number; no_show_count: number }>();
  for (const row of (usersRes.data ?? []) as Array<{ id: string; decline_count: number; no_show_count: number }>) {
    userMap.set(row.id, row);
  }

  const ownerBlocks = new Set<string>();
  const blocksOwner = new Set<string>();
  for (const b of (blockRes.data ?? []) as Array<{ blocker_id: string; blocked_id: string }>) {
    if (b.blocker_id === spot.user_id) ownerBlocks.add(b.blocked_id);
    if (b.blocked_id === spot.user_id) blocksOwner.add(b.blocker_id);
  }

  const tierBonus: Record<string, number> = {
    bronze: 0,
    silver: 2,
    gold: 4,
    community_partner: 6,
  };

  const eligible: SeekCandidateScored[] = [];
  for (const candidate of candidates) {
    if (ownerBlocks.has(candidate.user_id)) continue;
    if (blocksOwner.has(candidate.user_id)) continue;

    const rank = rankMap.get(candidate.user_id);
    const user = userMap.get(candidate.user_id);
    const trust = rank?.trust_score ?? 5.0;
    const reliability = (user?.decline_count ?? 0) + (user?.no_show_count ?? 0) * 2;

    let score = 0;
    score += trust * 10;
    score += tierBonus[rank?.rank_tier ?? "bronze"] ?? 0;
    score += (rank?.successful_handoffs ?? 0) * 0.5;
    score -= (rank?.flags_received ?? 0) * 1;
    score -= reliability * 1;
    score -= candidate.distance / 1000; // tiebreak: prefer closer

    eligible.push({ ...candidate, score });
  }

  if (eligible.length === 0) return null;

  return eligible.sort((a, b) => b.score - a.score)[0];
}

/**
 * Creates an exclusive offer for a single seeker: an 'offered' match with an
 * acceptance window, plus a push notification. The in-app notification is
 * created by the notify_match_created trigger.
 */
export async function createExclusiveOffer(
  spot: ExclusiveSpot,
  seekerId: string,
): Promise<{ offerId: string } | null> {
  const supabase = createAdminClient();

  // Guard: don't double-offer a spot that already has an active offer/match
  const { data: existing } = await supabase
    .from("spot_matches")
    .select("id")
    .eq("spot_id", spot.id)
    .in("status", ["offered", "pending", "confirmed_by_owner", "confirmed_by_seeker", "confirmed"])
    .maybeSingle();

  if (existing) return null;

  const now = new Date();
  const offerExpiresAt = new Date(now.getTime() + getOfferWindowMs()).toISOString();

  const { data: inserted, error } = await supabase
    .from("spot_matches")
    .insert({
      spot_id: spot.id,
      spot_owner_id: spot.user_id,
      seeker_id: seekerId,
      status: "offered",
      offer_sent_at: now.toISOString(),
      offer_expires_at: offerExpiresAt,
    })
    .select("id")
    .single();

  if (error || !inserted) return null;

  // Track the attempt
  await supabase
    .from("parking_spots")
    .update({ exclusive_attempts: spot.exclusive_attempts + 1 })
    .eq("id", spot.id);

  const { data: ownerUser } = await supabase
    .from("users")
    .select("name")
    .eq("id", spot.user_id)
    .single();

  const windowSec = Math.round(getOfferWindowMs() / 1000);

  await sendPushToUser(seekerId, {
    type: "exclusive_offer",
    title: "You've got an exclusive spot offer!",
    body: `${ownerUser?.name || "Someone"} is leaving a spot${spot.address ? ` on ${spot.address}` : ""}. You have ${windowSec}s to accept before it goes to someone else.`,
    match_id: inserted.id,
    spot_id: spot.id,
    spot_lat: spot.latitude,
    spot_lon: spot.longitude,
    spot_street: spot.address,
    departing_user_name: ownerUser?.name || "Someone",
    offer_expires_at: offerExpiresAt,
  });

  return { offerId: inserted.id };
}

/**
 * Closes the current offer and either re-offers the spot to the next-best
 * seeker or falls back to a public claimable alert once the configured number
 * of exclusive attempts is exhausted.
 */
export async function reassignOffer(
  spotId: string,
  currentOfferId: string,
  reason: "declined" | "expired",
): Promise<{ reassigned: boolean; fallback: boolean }> {
  const supabase = createAdminClient();

  const nextStatus = reason === "declined" ? "offer_declined" : "offer_expired";

  const { data: match } = await supabase
    .from("spot_matches")
    .select("id, seeker_id, status")
    .eq("id", currentOfferId)
    .single();

  if (match && match.status === "offered") {
    await supabase
      .from("spot_matches")
      .update({ status: nextStatus })
      .eq("id", currentOfferId);

    if (reason === "declined") {
      await incrementReliabilityCounter(match.seeker_id, "decline_count");
    }
  }

  return attemptNextOffer(spotId);
}

/**
 * Tries to find and offer the next-best compatible seeker for a spot.
 * Falls back to a public claimable alert once exclusive attempts are exhausted
 * or there are no remaining compatible candidates.
 */
export async function attemptNextOffer(
  spotId: string,
  extraExcludeSeekerIds: string[] = [],
): Promise<{ reassigned: boolean; fallback: boolean }> {
  const supabase = createAdminClient();

  const { data: spot, error: spotError } = await supabase
    .from("parking_spots")
    .select("*")
    .eq("id", spotId)
    .eq("status", "active")
    .single();

  if (spotError || !spot) return { reassigned: false, fallback: false };

  const exclusiveSpot = spot as unknown as ExclusiveSpot;

  if (exclusiveSpot.visibility === "public") return { reassigned: false, fallback: false };

  // Which seekers have already been offered this spot?
  const { data: offeredSoFar } = await supabase
    .from("spot_matches")
    .select("seeker_id")
    .eq("spot_id", spotId)
    .in("status", ["offered", "offer_declined", "offer_expired"]);

  const excludeIds = [
    ...new Set([
      ...(offeredSoFar ?? []).map((o) => o.seeker_id),
      ...extraExcludeSeekerIds,
    ]),
  ];

  const nextBest = await findBestSeeker(exclusiveSpot, excludeIds);

  // No candidates left, or exclusive attempts exhausted -> public fallback so
  // the spot doesn't sit hidden and wasted.
  if (!nextBest || exclusiveSpot.exclusive_attempts >= exclusiveSpot.max_exclusive_attempts) {
    await supabase
      .from("parking_spots")
      .update({ visibility: "public" })
      .eq("id", spotId);

    await supabase.from("notifications").insert({
      user_id: spot.user_id,
      title: "No one accepted yet",
      message: "Your spot is now visible on the public map so anyone nearby can claim it.",
      type: "match",
    });

    return { reassigned: false, fallback: true };
  }

  const offer = await createExclusiveOffer(exclusiveSpot, nextBest.user_id);
  if (!offer) return { reassigned: false, fallback: false };

  return { reassigned: true, fallback: false };
}

/**
 * Finds exclusive spots that currently have no active offer/match and retries
 * exclusive matching for them. Prevents hidden spots from lingering when a new
 * seeker shows up nearby.
 */
export async function sweepExclusiveSpots(): Promise<{ swept: number; offered: number; fallback: number }> {
  const supabase = createAdminClient();

  const { data: spots } = await supabase
    .from("parking_spots")
    .select("*")
    .eq("status", "active")
    .eq("visibility", "exclusive")
    .gt("expires_at", new Date().toISOString())
    .lt("departure_time", new Date(Date.now() + 60 * 60 * 1000).toISOString())
    .order("departure_time", { ascending: true });

  let offered = 0;
  let fallback = 0;

  for (const spot of (spots ?? []) as Array<{ id: string }>) {
    const { data: activeMatch } = await supabase
      .from("spot_matches")
      .select("id")
      .eq("spot_id", spot.id)
      .in("status", ["offered", "pending", "confirmed_by_owner", "confirmed_by_seeker", "confirmed"])
      .maybeSingle();

    if (activeMatch) continue;

    const result = await attemptNextOffer(spot.id);
    if (result.reassigned) offered++;
    if (result.fallback) fallback++;
  }

  return { swept: (spots ?? []).length, offered, fallback };
}

/**
 * Finds offered matches whose acceptance window has elapsed and reassigns them.
 */
export async function expireStaleOffers(): Promise<{ expired: number; reassigned: number; fallback: number }> {
  const supabase = createAdminClient();

  const { data: stale } = await supabase
    .from("spot_matches")
    .select("id, spot_id")
    .eq("status", "offered")
    .lt("offer_expires_at", new Date().toISOString());

  let expired = 0;
  let reassigned = 0;
  let fallback = 0;

  for (const offer of (stale ?? []) as Array<{ id: string; spot_id: string }>) {
    const result = await reassignOffer(offer.spot_id, offer.id, "expired");
    expired++;
    if (result.reassigned) reassigned++;
    if (result.fallback) fallback++;
  }

  return { expired, reassigned, fallback };
}
