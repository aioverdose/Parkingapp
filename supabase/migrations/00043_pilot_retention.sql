-- Pilot retention: keep aggregate handoff records while removing precise,
-- operationally unnecessary location and ephemeral conversation data.

CREATE OR REPLACE FUNCTION public.cleanup_pilot_retention(
  p_location_retention INTERVAL DEFAULT INTERVAL '1 hour',
  p_ephemeral_retention INTERVAL DEFAULT INTERVAL '7 days'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_offers INTEGER;
  deleted_driver_locations INTEGER;
  deleted_car_locations INTEGER;
  deleted_chats INTEGER;
BEGIN
  -- This is idempotent and prevents stale offered rows from remaining live if
  -- the application worker was interrupted.
  UPDATE public.spot_matches
  SET status = 'offer_expired'
  WHERE status = 'offered'
    AND offer_expires_at IS NOT NULL
    AND offer_expires_at < now();
  GET DIAGNOSTICS expired_offers = ROW_COUNT;

  DELETE FROM public.driver_locations
  WHERE recorded_at < now() - p_location_retention
     OR match_id IN (
       SELECT id
       FROM public.spot_matches
       WHERE status IN ('confirmed', 'rejected', 'offer_declined', 'offer_expired', 'expired')
         AND updated_at < now() - p_location_retention
     );
  GET DIAGNOSTICS deleted_driver_locations = ROW_COUNT;

  DELETE FROM public.car_locations
  WHERE (status = 'departed' AND departed_at < now() - p_location_retention)
     OR updated_at < now() - p_location_retention;
  GET DIAGNOSTICS deleted_car_locations = ROW_COUNT;

  -- Closing old chats first makes the operation safe even if a client never
  -- sent its final handoff state.
  UPDATE public.ephemeral_chats
  SET status = 'expired', closed_at = COALESCE(closed_at, now())
  WHERE status = 'active'
    AND expires_at < now();

  DELETE FROM public.ephemeral_chats
  WHERE status IN ('completed', 'expired')
    AND COALESCE(closed_at, expires_at, created_at) < now() - p_ephemeral_retention;
  GET DIAGNOSTICS deleted_chats = ROW_COUNT;

  RETURN jsonb_build_object(
    'expired_offers', expired_offers,
    'deleted_driver_locations', deleted_driver_locations,
    'deleted_car_locations', deleted_car_locations,
    'deleted_chats', deleted_chats
  );
END;
$$;

COMMENT ON FUNCTION public.cleanup_pilot_retention(INTERVAL, INTERVAL) IS
  'Idempotent pilot cleanup for stale offers, precise locations, car traces, and ephemeral chats';
