-- Idempotent recurring-schedule window synchronization.

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, source_type, source_id, role, day_of_week
           ORDER BY created_at DESC, id DESC
         ) AS row_number
  FROM public.matching_schedule_windows
  WHERE source_type = 'recurring_schedule'
    AND source_id IS NOT NULL
), duplicates AS (
  SELECT id FROM ranked WHERE row_number > 1
)
DELETE FROM public.matching_schedule_windows windows
USING duplicates
WHERE windows.id = duplicates.id;

CREATE UNIQUE INDEX IF NOT EXISTS matching_schedule_windows_recurring_identity_uidx
  ON public.matching_schedule_windows(user_id, source_type, source_id, role, day_of_week)
  WHERE source_type = 'recurring_schedule' AND source_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_recurring_schedule_windows(p_user_id UUID)
RETURNS TABLE (
  eligible_schedule_count INTEGER,
  generated_window_count INTEGER,
  deleted_window_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INTEGER;
  generated_count INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'SYNC_USER_REQUIRED' USING ERRCODE = '22004';
  END IF;

  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'SYNC_UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT, 0));

  WITH eligible AS (
    SELECT rs.id
    FROM public.recurring_schedules rs
    WHERE rs.user_id = p_user_id
      AND rs.active = TRUE
      AND (rs.start_date IS NULL OR rs.start_date <= CURRENT_DATE)
      AND (rs.end_date IS NULL OR rs.end_date >= CURRENT_DATE)
      AND rs.days_of_week IS NOT NULL
      AND cardinality(rs.days_of_week) > 0
      AND rs.departure_time IS NOT NULL
      AND rs.return_time IS NOT NULL
  )
  SELECT count(*)::INTEGER INTO eligible_schedule_count FROM eligible;

  DELETE FROM public.matching_schedule_windows
  WHERE user_id = p_user_id
    AND source_type = 'recurring_schedule';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  INSERT INTO public.matching_schedule_windows (
    user_id,
    role,
    day_of_week,
    window_start,
    window_end,
    time_zone,
    area_latitude,
    area_longitude,
    vehicle_type,
    matching_enabled,
    active,
    source_type,
    source_id,
    expires_at
  )
  SELECT
    rs.user_id,
    generated.role,
    generated.day_of_week,
    generated.window_start,
    generated.window_end,
    COALESCE(rs.timezone, 'America/Los_Angeles'),
    rs.latitude,
    rs.longitude,
    COALESCE(rs.vehicle_type, profile.vehicle_type),
    TRUE,
    TRUE,
    'recurring_schedule',
    rs.id,
    CASE
      WHEN rs.end_date IS NULL THEN NULL
      ELSE (rs.end_date + TIME '23:59:59') AT TIME ZONE COALESCE(rs.timezone, 'UTC')
    END
  FROM public.recurring_schedules rs
  LEFT JOIN public.users profile ON profile.id = rs.user_id
  CROSS JOIN LATERAL (
    VALUES
      (
        'departing'::TEXT,
        COALESCE(profile.schedule_departure, rs.departure_time),
        COALESCE(profile.schedule_departure, rs.departure_time),
        rs.days_of_week
      ),
      (
        'arriving'::TEXT,
        COALESCE(profile.schedule_arrival, rs.return_time),
        COALESCE(profile.schedule_arrival, rs.return_time),
        rs.days_of_week
      )
  ) schedule_times(role, center_time, unused_time, days)
  CROSS JOIN LATERAL unnest(schedule_times.days) day(day_of_week)
  CROSS JOIN LATERAL (
    SELECT
      schedule_times.role,
      day.day_of_week::SMALLINT,
      (schedule_times.center_time - INTERVAL '5 minutes')::TIME AS window_start,
      (schedule_times.center_time + INTERVAL '5 minutes')::TIME AS window_end
  ) generated
  WHERE rs.user_id = p_user_id
    AND rs.active = TRUE
    AND (rs.start_date IS NULL OR rs.start_date <= CURRENT_DATE)
    AND (rs.end_date IS NULL OR rs.end_date >= CURRENT_DATE)
    AND rs.days_of_week IS NOT NULL
    AND cardinality(rs.days_of_week) > 0
    AND rs.departure_time IS NOT NULL
    AND rs.return_time IS NOT NULL
  ON CONFLICT (user_id, source_type, source_id, role, day_of_week)
  WHERE source_type = 'recurring_schedule' AND source_id IS NOT NULL
  DO UPDATE SET
    window_start = EXCLUDED.window_start,
    window_end = EXCLUDED.window_end,
    time_zone = EXCLUDED.time_zone,
    area_latitude = EXCLUDED.area_latitude,
    area_longitude = EXCLUDED.area_longitude,
    vehicle_type = EXCLUDED.vehicle_type,
    matching_enabled = EXCLUDED.matching_enabled,
    active = EXCLUDED.active,
    expires_at = EXCLUDED.expires_at,
    updated_at = now();
  GET DIAGNOSTICS generated_count = ROW_COUNT;

  generated_window_count := generated_count;
  deleted_window_count := deleted_count;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_recurring_schedule_windows(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_recurring_schedule_windows(UUID) TO service_role;
