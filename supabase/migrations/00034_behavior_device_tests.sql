-- Device test harness: real-hardware (GPS + DeviceMotion) runs of the micro
-- behavior agent, recorded so results can be reviewed in the admin dashboard.

CREATE TABLE IF NOT EXISTS public.behavior_device_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_label TEXT,
  test_name TEXT NOT NULL DEFAULT 'hardware sensor run',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'complete', 'aborted')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_behavior_device_tests_user ON public.behavior_device_tests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_device_tests_status ON public.behavior_device_tests(status);

CREATE TABLE IF NOT EXISTS public.behavior_test_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.behavior_device_tests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('state', 'agent_event', 'sensor', 'permission', 'note', 'error')),
  agent_state TEXT,
  agent_event_type TEXT,
  confidence REAL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  speed_ms REAL,
  accuracy REAL,
  vibration_energy REAL,
  step_cadence REAL,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_behavior_test_events_test ON public.behavior_test_events(test_id, created_at);

ALTER TABLE public.behavior_device_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_test_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own device tests"
  ON public.behavior_device_tests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own device tests"
  ON public.behavior_device_tests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own device tests"
  ON public.behavior_device_tests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test events"
  ON public.behavior_test_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own test events"
  ON public.behavior_test_events FOR SELECT
  USING (auth.uid() = user_id);

-- TTL: keep only the last 90 days of device tests
CREATE OR REPLACE FUNCTION public.cleanup_behavior_device_tests()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.behavior_device_tests
  WHERE created_at < now() - INTERVAL '90 days';
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'schedule'
    AND pronamespace = 'cron'::regnamespace
  ) THEN
    PERFORM cron.schedule(
      'cleanup-behavior-device-tests',
      '0 4 * * *',
      'select public.cleanup_behavior_device_tests()'
    );
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;
