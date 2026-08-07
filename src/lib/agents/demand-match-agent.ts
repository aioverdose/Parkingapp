import { createAdminClient } from "@/lib/supabaseAdmin";
import { findBestSeeker, createExclusiveOffer, type ExclusiveSpot } from "@/lib/matching/exclusive-matcher";

interface NewSpot {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  departure_time: string;
  address: string;
  vehicle_type: string | null;
}

/**
 * Exclusive demand matching: exactly one best-compatible seeker is offered the
 * spot. Nobody else is notified — they only learn about it if the best seeker
 * declines or the offer expires and it is reassigned to them.
 */
export async function runDemandMatch(spot: NewSpot) {
  const supabase = createAdminClient();

  const { data: fullSpot } = await supabase
    .from("parking_spots")
    .select("*")
    .eq("id", spot.id)
    .single();

  if (!fullSpot) return { matched: 0 };

  const exclusiveSpot = fullSpot as unknown as ExclusiveSpot;

  const best = await findBestSeeker(exclusiveSpot);
  if (!best) return { matched: 0, reason: "No compatible seekers" };

  const offer = await createExclusiveOffer(exclusiveSpot, best.user_id);
  if (!offer) return { matched: 0, reason: "Spot already has an active offer" };

  return { matched: 1, match_id: offer.offerId, seeker_id: best.user_id };
}
