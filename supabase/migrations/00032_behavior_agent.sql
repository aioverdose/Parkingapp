-- Behavior agent: per-user sensor/preferences + event audit log

CREATE TABLE IF NOT EXISTS public.behavior_agent_config (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  auto_confirm BOOLEAN NOT NULL DEFAULT true,
  auto_post BOOLEAN NOT NULL DEFAULT false,
  thresholds JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.behavior_agent_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own behavior agent config"
  ON public.behavior_agent_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own behavior agent config"
  ON public.behavior_agent_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own behavior agent config"
  ON public.behavior_agent_config FOR UPDATE
  USING (auth.uid() = user_id);

-- Event audit log: records which agent decisions fired and why (for undo/debug)
CREATE TABLE IF NOT EXISTS public.agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_user ON public.agent_events(user_id, created_at DESC);

ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own agent events"
  ON public.agent_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own agent events"
  ON public.agent_events FOR SELECT
  USING (auth.uid() = user_id);

-- TTL: keep only the last 30 days of agent events
CREATE OR REPLACE FUNCTION public.cleanup_agent_events()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.agent_events
  WHERE created_at < now() - INTERVAL '30 days';
$$;

-- updated_at maintenance for config
CREATE OR REPLACE FUNCTION public.update_behavior_agent_config_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_behavior_agent_config_updated_at ON public.behavior_agent_config;
CREATE TRIGGER trg_behavior_agent_config_updated_at
  BEFORE UPDATE ON public.behavior_agent_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_behavior_agent_config_updated_at();

-- Register TTL cleanup with pg_cron if available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'schedule'
    AND pronamespace = 'cron'::regnamespace
  ) THEN
    PERFORM cron.schedule(
      'cleanup-agent-events',
      '0 3 * * *',
      'select public.cleanup_agent_events()'
    );
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;
