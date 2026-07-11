-- TOS columns on users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS tos_version TEXT,
ADD COLUMN IF NOT EXISTS tos_hash TEXT,
ADD COLUMN IF NOT EXISTS tos_signed_at TIMESTAMPTZ;

-- Contribution stats for rankings
CREATE TABLE IF NOT EXISTS public.contribution_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  spots_posted INT NOT NULL DEFAULT 0,
  spots_claimed INT NOT NULL DEFAULT 0,
  hours_saved NUMERIC(10,2) NOT NULL DEFAULT 0,
  streak_7d INT NOT NULL DEFAULT 0,
  streak_30d INT NOT NULL DEFAULT 0,
  neighborhood TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contribution_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read contribution_stats"
  ON public.contribution_stats FOR SELECT
  USING (true);

CREATE POLICY "System can insert/update contribution_stats"
  ON public.contribution_stats FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_contribution_stats_hours_saved ON public.contribution_stats(hours_saved DESC);
CREATE INDEX IF NOT EXISTS idx_contribution_stats_neighborhood ON public.contribution_stats(neighborhood);
CREATE INDEX IF NOT EXISTS idx_contribution_stats_streak_7d ON public.contribution_stats(streak_7d DESC);
CREATE INDEX IF NOT EXISTS idx_contribution_stats_streak_30d ON public.contribution_stats(streak_30d DESC);
