-- Privacy-safe, append-only matching operations observability for staging.

CREATE TABLE IF NOT EXISTS public.matching_operations_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_name TEXT NOT NULL CHECK (event_name IN (
    'schedule_window_sync_started',
    'schedule_window_sync_completed',
    'schedule_window_sync_failed',
    'neutral_scan_completed',
    'neutral_scan_failed',
    'legacy_matching_disabled'
  )),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  environment TEXT NOT NULL DEFAULT 'staging' CHECK (environment = 'staging'),
  correlation_id UUID NOT NULL,
  deployment_id TEXT CHECK (deployment_id IS NULL OR deployment_id ~ '^[A-Za-z0-9._-]{1,32}$'),
  commit_id TEXT CHECK (commit_id IS NULL OR commit_id ~ '^[A-Za-z0-9._-]{1,16}$'),
  route_origin TEXT NOT NULL CHECK (char_length(route_origin) BETWEEN 1 AND 120),
  actor_scope TEXT NOT NULL CHECK (actor_scope IN ('synthetic', 'system', 'admin')),
  actor_label TEXT CHECK (actor_label IS NULL OR actor_label ~ '^[a-z0-9_-]{1,64}$'),
  outcome TEXT NOT NULL CHECK (outcome IN ('started', 'success', 'failure', 'blocked')),
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  eligible_schedule_count INTEGER CHECK (eligible_schedule_count IS NULL OR eligible_schedule_count >= 0),
  generated_window_count INTEGER CHECK (generated_window_count IS NULL OR generated_window_count >= 0),
  deleted_window_count INTEGER CHECK (deleted_window_count IS NULL OR deleted_window_count >= 0),
  scan_count INTEGER CHECK (scan_count IS NULL OR scan_count >= 0),
  candidate_count INTEGER CHECK (candidate_count IS NULL OR candidate_count >= 0),
  potential_match_count INTEGER CHECK (potential_match_count IS NULL OR potential_match_count >= 0),
  dedupe_suppression_count INTEGER CHECK (dedupe_suppression_count IS NULL OR dedupe_suppression_count >= 0),
  failure_code TEXT CHECK (failure_code IS NULL OR failure_code ~ '^[A-Z0-9_]{1,64}$'),
  schema_version SMALLINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS matching_operations_events_time_idx
  ON public.matching_operations_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS matching_operations_events_name_time_idx
  ON public.matching_operations_events(event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS matching_operations_events_outcome_time_idx
  ON public.matching_operations_events(outcome, occurred_at DESC);
CREATE INDEX IF NOT EXISTS matching_operations_events_correlation_idx
  ON public.matching_operations_events(correlation_id);
CREATE INDEX IF NOT EXISTS matching_operations_events_deployment_time_idx
  ON public.matching_operations_events(deployment_id, occurred_at DESC);

ALTER TABLE public.matching_operations_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.prevent_matching_operations_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'MATCHING_OPERATIONS_EVENTS_APPEND_ONLY' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS matching_operations_events_append_only_trigger
  ON public.matching_operations_events;
CREATE TRIGGER matching_operations_events_append_only_trigger
BEFORE UPDATE OR DELETE ON public.matching_operations_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_matching_operations_event_mutation();

CREATE OR REPLACE FUNCTION public.record_matching_operations_event(
  p_event_name TEXT,
  p_correlation_id UUID,
  p_deployment_id TEXT,
  p_commit_id TEXT,
  p_route_origin TEXT,
  p_actor_scope TEXT,
  p_actor_label TEXT,
  p_outcome TEXT,
  p_duration_ms INTEGER DEFAULT NULL,
  p_eligible_schedule_count INTEGER DEFAULT NULL,
  p_generated_window_count INTEGER DEFAULT NULL,
  p_deleted_window_count INTEGER DEFAULT NULL,
  p_scan_count INTEGER DEFAULT NULL,
  p_candidate_count INTEGER DEFAULT NULL,
  p_potential_match_count INTEGER DEFAULT NULL,
  p_dedupe_suppression_count INTEGER DEFAULT NULL,
  p_failure_code TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'MATCHING_OPERATIONS_EVENT_UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.matching_operations_events (
    event_name, environment, correlation_id, deployment_id, commit_id,
    route_origin, actor_scope, actor_label, outcome, duration_ms,
    eligible_schedule_count, generated_window_count, deleted_window_count,
    scan_count, candidate_count, potential_match_count,
    dedupe_suppression_count, failure_code
  ) VALUES (
    p_event_name, 'staging', p_correlation_id, p_deployment_id, p_commit_id,
    p_route_origin, p_actor_scope, p_actor_label, p_outcome, p_duration_ms,
    p_eligible_schedule_count, p_generated_window_count, p_deleted_window_count,
    p_scan_count, p_candidate_count, p_potential_match_count,
    p_dedupe_suppression_count, p_failure_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_matching_operations_health(p_window_hours INTEGER DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  window_hours INTEGER := LEAST(GREATEST(COALESCE(p_window_hours, 24), 1), 168);
  since_time TIMESTAMPTZ;
  eligible_users INTEGER;
  window_users INTEGER;
  missing_users INTEGER;
  window_count INTEGER;
  sync_successes INTEGER;
  sync_failures INTEGER;
  scans INTEGER;
  zero_scans INTEGER;
  dedupe_count INTEGER;
  blocked_count INTEGER;
  current_potential_matches INTEGER;
  avg_latency NUMERIC;
  neutral_enabled BOOLEAN;
  legacy_enabled BOOLEAN;
  derived_status TEXT;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'MATCHING_OPERATIONS_HEALTH_UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;

  since_time := now() - make_interval(hours => window_hours);

  SELECT count(DISTINCT rs.user_id)::INTEGER
  INTO eligible_users
  FROM public.recurring_schedules rs
  JOIN public.users u ON u.id = rs.user_id
  WHERE lower(COALESCE(u.email, '')) LIKE '%@parkingmeeters.test'
    AND rs.active = TRUE
    AND (rs.start_date IS NULL OR rs.start_date <= CURRENT_DATE)
    AND (rs.end_date IS NULL OR rs.end_date >= CURRENT_DATE)
    AND rs.days_of_week IS NOT NULL
    AND cardinality(rs.days_of_week) > 0
    AND rs.departure_time IS NOT NULL
    AND rs.return_time IS NOT NULL;

  SELECT count(DISTINCT w.user_id)::INTEGER, count(*)::INTEGER
  INTO window_users, window_count
  FROM public.matching_schedule_windows w
  JOIN public.users u ON u.id = w.user_id
  WHERE lower(COALESCE(u.email, '')) LIKE '%@parkingmeeters.test'
    AND w.source_type = 'recurring_schedule'
    AND w.active = TRUE
    AND w.matching_enabled = TRUE;

  missing_users := GREATEST(eligible_users - window_users, 0);

  SELECT count(*)::INTEGER
  INTO current_potential_matches
  FROM public.potential_matches m
  JOIN public.users arriving ON arriving.id = m.arriving_user_id
  JOIN public.users departing ON departing.id = m.departing_user_id
  WHERE lower(COALESCE(arriving.email, '')) LIKE '%@parkingmeeters.test'
    AND lower(COALESCE(departing.email, '')) LIKE '%@parkingmeeters.test'
    AND m.status IN ('potential', 'accepted_by_arriving', 'accepted_by_departing', 'mutually_accepted')
    AND m.expires_at > now();

  SELECT count(*) FILTER (WHERE event_name = 'schedule_window_sync_completed' AND outcome = 'success')::INTEGER,
         count(*) FILTER (WHERE event_name = 'schedule_window_sync_failed' AND outcome = 'failure')::INTEGER,
         count(*) FILTER (WHERE event_name = 'neutral_scan_completed' AND outcome = 'success')::INTEGER,
         count(*) FILTER (WHERE event_name = 'neutral_scan_completed' AND outcome = 'success' AND COALESCE(candidate_count, 0) = 0)::INTEGER,
         COALESCE(sum(dedupe_suppression_count) FILTER (WHERE event_name = 'neutral_scan_completed'), 0)::INTEGER,
         count(*) FILTER (WHERE event_name = 'legacy_matching_disabled')::INTEGER,
         avg(duration_ms) FILTER (WHERE event_name IN ('schedule_window_sync_completed', 'neutral_scan_completed') AND outcome = 'success')
  INTO sync_successes, sync_failures, scans, zero_scans, dedupe_count, blocked_count, avg_latency
  FROM public.matching_operations_events
  WHERE occurred_at >= since_time;

  SELECT COALESCE(enabled, FALSE) INTO neutral_enabled
  FROM public.feature_flags WHERE name = 'neutral_matching_v1';
  SELECT COALESCE(enabled, FALSE) INTO legacy_enabled
  FROM public.feature_flags WHERE name = 'legacy_spot_matching_v1';

  IF legacy_enabled THEN
    derived_status := 'legacy-write-risk';
  ELSIF neutral_enabled IS NOT TRUE THEN
    derived_status := 'blocked';
  ELSIF sync_failures > 0 OR missing_users > 0 THEN
    derived_status := 'degraded';
  ELSE
    derived_status := 'healthy';
  END IF;

  RETURN jsonb_build_object(
    'status', derived_status,
    'window_hours', window_hours,
    'eligible_schedule_users', eligible_users,
    'users_with_current_windows', window_users,
    'users_missing_windows', missing_users,
    'current_window_count', window_count,
    'sync_success_count', sync_successes,
    'sync_failure_count', sync_failures,
    'scan_count', scans,
    'zero_candidate_scan_count', zero_scans,
    'potential_match_count', current_potential_matches,
    'dedupe_suppression_count', dedupe_count,
    'legacy_blocked_count', blocked_count,
    'average_latency_ms', COALESCE(round(avg_latency), 0),
    'neutral_matching_enabled', neutral_enabled,
    'legacy_matching_enabled', legacy_enabled,
    'privacy_safe', TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_matching_operations_events(
  p_limit INTEGER DEFAULT 50,
  p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  event_id BIGINT,
  event_name TEXT,
  occurred_at TIMESTAMPTZ,
  correlation_suffix TEXT,
  deployment_id TEXT,
  commit_id TEXT,
  route_origin TEXT,
  actor_scope TEXT,
  actor_label TEXT,
  outcome TEXT,
  duration_ms INTEGER,
  eligible_schedule_count INTEGER,
  generated_window_count INTEGER,
  deleted_window_count INTEGER,
  scan_count INTEGER,
  candidate_count INTEGER,
  potential_match_count INTEGER,
  dedupe_suppression_count INTEGER,
  failure_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'MATCHING_OPERATIONS_EVENTS_UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT e.id,
         e.event_name,
         e.occurred_at,
         right(e.correlation_id::TEXT, 8),
         e.deployment_id,
         e.commit_id,
         e.route_origin,
         e.actor_scope,
         e.actor_label,
         e.outcome,
         e.duration_ms,
         e.eligible_schedule_count,
         e.generated_window_count,
         e.deleted_window_count,
         e.scan_count,
         e.candidate_count,
         e.potential_match_count,
         e.dedupe_suppression_count,
         e.failure_code
  FROM public.matching_operations_events e
  WHERE p_before IS NULL OR e.occurred_at < p_before
  ORDER BY e.occurred_at DESC, e.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 50);
END;
$$;

REVOKE ALL ON TABLE public.matching_operations_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_matching_operations_event_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_matching_operations_event(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_matching_operations_health(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_matching_operations_events(INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_matching_operations_event(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_matching_operations_health(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_matching_operations_events(INTEGER, TIMESTAMPTZ) TO service_role;
