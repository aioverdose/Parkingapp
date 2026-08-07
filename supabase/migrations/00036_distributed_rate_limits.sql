-- Distributed rate limiting: a shared Postgres-backed store so limits are
-- enforced consistently across all Vercel serverless instances instead of the
-- previous per-instance in-memory Map.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON public.rate_limits (reset_at);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- The RPC is SECURITY DEFINER so it can read/write rate_limits without exposing
-- the table to clients.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER,
  p_window_ms INTEGER
)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reset_at TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  SELECT reset_at INTO v_reset_at
  FROM rate_limits
  WHERE key = p_key
  FOR UPDATE;

  -- Fresh window (no prior hit, or the window has elapsed)
  IF v_reset_at IS NULL OR v_reset_at <= now() THEN
    INSERT INTO rate_limits (key, count, reset_at, updated_at)
    VALUES (p_key, 1, now() + make_interval(secs => p_window_ms / 1000.0), now())
    ON CONFLICT (key) DO UPDATE SET
      count = 1,
      reset_at = EXCLUDED.reset_at,
      updated_at = now();

    RETURN QUERY SELECT
      true,
      GREATEST(p_max_requests - 1, 0),
      now() + make_interval(secs => p_window_ms / 1000.0);
    RETURN;
  END IF;

  SELECT count INTO v_count FROM rate_limits WHERE key = p_key;

  -- Limit reached
  IF v_count >= p_max_requests THEN
    RETURN QUERY SELECT false, 0, v_reset_at;
    RETURN;
  END IF;

  UPDATE rate_limits SET count = count + 1, updated_at = now() WHERE key = p_key;

  RETURN QUERY SELECT
    true,
    GREATEST(p_max_requests - v_count - 1, 0),
    v_reset_at;
END;
$$;

-- Cleanup of expired windows (run from the same cron that expires stale data).
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.rate_limits WHERE reset_at < now();
$$;

-- select cron.schedule('cleanup-rate-limits', '* * * * *', 'select public.cleanup_expired_rate_limits()');
