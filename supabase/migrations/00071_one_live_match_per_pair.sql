-- Keep the Match Protocol one-to-one: a pair may have only one live match.
CREATE UNIQUE INDEX IF NOT EXISTS spot_matches_one_live_match_per_pair
  ON public.spot_matches (
    LEAST(spot_owner_id, seeker_id),
    GREATEST(spot_owner_id, seeker_id)
  )
  WHERE status IN ('pending', 'offered', 'confirmed_by_owner', 'confirmed_by_seeker', 'confirmed');
