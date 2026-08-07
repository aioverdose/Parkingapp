-- Pilot safety: a network-attributed spot is never a public claimable marker.

UPDATE public.parking_spots
SET visibility = 'exclusive'
WHERE network_id IS NOT NULL
  AND visibility = 'public';

CREATE OR REPLACE FUNCTION public.enforce_network_spot_visibility()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.network_id IS NOT NULL AND NEW.visibility <> 'exclusive' THEN
    RAISE EXCEPTION 'Network spots must remain exclusive';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_network_spot_visibility ON public.parking_spots;
CREATE TRIGGER trg_enforce_network_spot_visibility
  BEFORE INSERT OR UPDATE OF network_id, visibility ON public.parking_spots
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_network_spot_visibility();

DROP POLICY IF EXISTS "Network members can read network spots" ON public.parking_spots;
DROP POLICY IF EXISTS "Anyone can read active spots" ON public.parking_spots;
CREATE POLICY "Active spots visible to owner or public"
  ON public.parking_spots FOR SELECT
  USING (
    status = 'active'
    AND (visibility = 'public' OR auth.uid() = user_id)
  );

CREATE POLICY "Network members can read network spots"
  ON public.parking_spots FOR SELECT
  USING (
    network_id IS NOT NULL
    AND public.user_is_network_member(network_id)
    AND (auth.uid() = user_id OR visibility = 'public')
  );
