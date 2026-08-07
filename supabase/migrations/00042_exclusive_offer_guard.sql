-- Pilot hardening: enforce one live offer/match per spot at the database level.
-- The application check remains useful for fast rejection, but this constraint
-- is the authority when two workers race.

WITH ranked_live_matches AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY spot_id
      ORDER BY COALESCE(offer_sent_at, created_at) DESC, created_at DESC, id DESC
    ) AS row_number
  FROM public.spot_matches
  WHERE status IN (
    'pending',
    'offered',
    'confirmed_by_owner',
    'confirmed_by_seeker',
    'confirmed'
  )
)
UPDATE public.spot_matches AS matches
SET status = 'offer_expired'
FROM ranked_live_matches AS ranked
WHERE matches.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS spot_matches_one_live_per_spot
  ON public.spot_matches (spot_id)
  WHERE status IN (
    'pending',
    'offered',
    'confirmed_by_owner',
    'confirmed_by_seeker',
    'confirmed'
  );

COMMENT ON INDEX public.spot_matches_one_live_per_spot IS
  'Prevents concurrent workers from creating more than one live offer or handoff per spot';
