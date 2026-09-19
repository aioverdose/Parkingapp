-- Cut over active matching to the neutral potential-match flow.
-- Legacy spot_matches are retained for audit history but no longer remain live.

UPDATE public.spot_matches
SET status = 'expired', updated_at = now()
WHERE status IN ('pending', 'offered', 'confirmed_by_owner', 'confirmed_by_seeker', 'confirmed');

INSERT INTO public.feature_flags (name, enabled, rollout, description)
VALUES ('legacy_spot_matching_v1', false, '{}'::jsonb, 'Legacy spot_matches matching is disabled after the potential-match cutover.')
ON CONFLICT (name) DO UPDATE
SET enabled = EXCLUDED.enabled, rollout = EXCLUDED.rollout, description = EXCLUDED.description, updated_at = now();

UPDATE public.feature_flags
SET enabled = true, rollout = '{"mode":"open"}'::jsonb,
    description = 'Potential matching is enabled for authenticated members testing the coordination flow.',
    updated_at = now()
WHERE name = 'neutral_matching_v1';

CREATE OR REPLACE FUNCTION public.block_legacy_spot_matching()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('pending', 'offered', 'confirmed_by_owner', 'confirmed_by_seeker', 'confirmed')
     AND EXISTS (SELECT 1 FROM public.feature_flags WHERE name = 'legacy_spot_matching_v1' AND enabled = false) THEN
    RAISE EXCEPTION 'Legacy spot matching is inactive; use potential matching.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_legacy_spot_matching_trigger ON public.spot_matches;
CREATE TRIGGER block_legacy_spot_matching_trigger
BEFORE INSERT OR UPDATE OF status ON public.spot_matches
FOR EACH ROW EXECUTE FUNCTION public.block_legacy_spot_matching();
