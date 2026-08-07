-- Structured log persistence for server-side errors and key events. Rows are
-- written exclusively through the insert_app_log RPC (service role / SECURITY
-- DEFINER) so the table is never exposed to clients.

CREATE TABLE IF NOT EXISTS public.app_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  message TEXT NOT NULL,
  context JSONB,
  route TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_logs_created ON public.app_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON public.app_logs (level);

ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.insert_app_log(
  p_level TEXT,
  p_message TEXT,
  p_context JSONB DEFAULT NULL,
  p_route TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.app_logs (level, message, context, route, user_id)
  VALUES (p_level, p_message, p_context, p_route, p_user_id);
$$;

-- Retention cleanup (defaults to 30 days).
CREATE OR REPLACE FUNCTION public.cleanup_expired_app_logs(p_retention_days INTEGER DEFAULT 30)
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.app_logs WHERE created_at < now() - make_interval(days => p_retention_days);
$$;

-- select cron.schedule('cleanup-app-logs', '0 3 * * *', 'select public.cleanup_expired_app_logs()');
