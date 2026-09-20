ALTER TABLE public.potential_matches
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS potential_matches_semantic_uidx
  ON public.potential_matches(dedupe_key)
  WHERE status IN ('potential', 'accepted_by_arriving', 'accepted_by_departing', 'mutually_accepted');
