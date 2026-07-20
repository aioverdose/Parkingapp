-- Live Location Sharing for Confirmed Matches
-- Privacy-first: data is temporary, auto-deleted, access strictly scoped via RLS.
-- Compliant with CCPA: data minimization, easy opt-out, no unnecessary retention.

-- 1. Add consent tracking to active_sessions
ALTER TABLE public.active_sessions
ADD COLUMN IF NOT EXISTS location_shared BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS location_shared_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS location_stopped_at TIMESTAMPTZ;

-- 2. RLS: Users can only see driver_locations for their own active confirmed match.
--    This is the critical privacy boundary.

-- Drop overly broad policies if they exist
DROP POLICY IF EXISTS "Anyone can read congestion alerts" ON public.driver_locations;

-- Users can INSERT their own location
CREATE POLICY "Users can insert own driver location"
  ON public.driver_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read locations ONLY for matches they are part of
-- and only when the match is confirmed and location sharing is active.
CREATE POLICY "Match participants can read each other location"
  ON public.driver_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.spot_matches sm
      INNER JOIN public.active_sessions ases ON ases.match_id = sm.id
      WHERE sm.id = driver_locations.match_id
        AND ases.location_shared = true
        AND ases.location_stopped_at IS NULL
        AND ases.status NOT IN ('completed', 'no_show')
        AND (sm.spot_owner_id = auth.uid() OR sm.seeker_id = auth.uid())
        AND driver_locations.user_id != auth.uid()
    )
  );

-- Users can UPDATE their own location rows (for accuracy corrections)
CREATE POLICY "Users can update own driver location"
  ON public.driver_locations FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can DELETE their own location rows
CREATE POLICY "Users can delete own driver location"
  ON public.driver_locations FOR DELETE
  USING (auth.uid() = user_id);

-- 3. RLS: Users can read/write their own active_sessions
--    (existing policies may already cover this, but ensure location_shared is updatable)

-- 4. Auto-delete old location records (older than 1 hour) via pg_cron or manual call
--    Run periodically: SELECT public.cleanup_old_driver_locations();
CREATE OR REPLACE FUNCTION public.cleanup_old_driver_locations()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.driver_locations
  WHERE recorded_at < now() - INTERVAL '1 hour';
$$;

-- 5. Auto-stop location sharing when match ends (completed/no_show/rejected)
CREATE OR REPLACE FUNCTION public.auto_stop_location_on_match_end()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IN ('completed', 'no_show', 'rejected', 'expired')
     AND OLD.status NOT IN ('completed', 'no_show', 'rejected', 'expired') THEN
    UPDATE public.active_sessions
    SET location_shared = false,
        location_stopped_at = now()
    WHERE match_id = NEW.id
      AND location_shared = true
      AND location_stopped_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_stop_location ON public.spot_matches;
CREATE TRIGGER trg_auto_stop_location
  AFTER UPDATE OF status ON public.spot_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_stop_location_on_match_end();

-- 6. Index for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_driver_locations_recorded_at
  ON public.driver_locations(recorded_at);
