-- Security hardening for production trust boundaries.
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code TEXT,
  code_hash TEXT,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own OTPs" ON public.phone_otps;
CREATE POLICY "Users can read their own OTPs" ON public.phone_otps FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_phone_otps_hash ON public.phone_otps(user_id, phone, code_hash);

DROP POLICY IF EXISTS "System can insert/update contribution_stats" ON public.contribution_stats;
DROP POLICY IF EXISTS "Users can update own ranking" ON public.user_ranking;

REVOKE EXECUTE ON FUNCTION public.award_handoff_xp(UUID, UUID, BOOLEAN, INTEGER, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_perfect_park(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_award_badges(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.progress_quest(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_daily_quests(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_game_state(UUID) FROM PUBLIC, anon, authenticated;
