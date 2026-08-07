-- Pilot infrastructure: schedule data retention in Supabase when pg_cron is
-- available. Offer expiry/reassignment remains in the protected API job because
-- candidate selection and push delivery are application responsibilities.

CREATE OR REPLACE FUNCTION public.cleanup_pilot_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_spots INTEGER;
  completed_spots INTEGER;
  deleted_driver_locations INTEGER;
  deleted_car_locations INTEGER;
  deleted_chats INTEGER;
BEGIN
  -- Preserve match history while removing spots that can no longer be acted on.
  UPDATE public.parking_spots
  SET status = 'taken'
  WHERE status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.spot_matches sm
      WHERE sm.spot_id = parking_spots.id
        AND sm.status = 'completed'
    );
  GET DIAGNOSTICS completed_spots = ROW_COUNT;

  UPDATE public.parking_spots
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();
  GET DIAGNOSTICS expired_spots = ROW_COUNT;

  DELETE FROM public.driver_locations
  WHERE recorded_at < now() - INTERVAL '1 hour'
     OR match_id IN (
       SELECT id
       FROM public.spot_matches
       WHERE status IN ('completed', 'rejected', 'offer_declined', 'offer_expired', 'expired')
     );
  GET DIAGNOSTICS deleted_driver_locations = ROW_COUNT;

  DELETE FROM public.car_locations
  WHERE (status = 'departed' AND departed_at < now() - INTERVAL '1 hour')
     OR updated_at < now() - INTERVAL '1 hour';
  GET DIAGNOSTICS deleted_car_locations = ROW_COUNT;

  UPDATE public.ephemeral_chats
  SET status = 'expired', closed_at = COALESCE(closed_at, now())
  WHERE status = 'active'
    AND expires_at < now();

  DELETE FROM public.ephemeral_chats
  WHERE status IN ('completed', 'expired')
    AND COALESCE(closed_at, expires_at, created_at) < now() - INTERVAL '7 days';
  GET DIAGNOSTICS deleted_chats = ROW_COUNT;

  RETURN jsonb_build_object(
    'completed_spots', completed_spots,
    'expired_spots', expired_spots,
    'deleted_driver_locations', deleted_driver_locations,
    'deleted_car_locations', deleted_car_locations,
    'deleted_chats', deleted_chats
  );
END;
$$;

COMMENT ON FUNCTION public.cleanup_pilot_data() IS
  'Idempotent cleanup for stale spots, completed handoffs, precise locations, and ephemeral chats';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'spotmatch-pilot-retention';

    PERFORM cron.schedule(
      'spotmatch-pilot-retention',
      '*/5 * * * *',
      'SELECT public.cleanup_pilot_data();'
    );
  END IF;
EXCEPTION
  WHEN undefined_table OR undefined_function THEN
    -- The migration remains deployable when pg_cron is unavailable. The
    -- protected API job still invokes cleanup_pilot_retention.
    NULL;
END;
$$;
