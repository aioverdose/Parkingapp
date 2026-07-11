-- ============================================
-- Run ALL of this in Supabase SQL editor
-- Paste everything below and click "Run"
-- ============================================

-- 00008: Spot requests table
CREATE TABLE IF NOT EXISTS public.spot_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INT NOT NULL DEFAULT 300,
  vehicle_type TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'found', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.spot_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active spot requests"
  ON public.spot_requests FOR SELECT
  USING (status = 'active' AND expires_at > now());

CREATE POLICY "Users can create their own spot requests"
  ON public.spot_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spot requests"
  ON public.spot_requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own spot requests"
  ON public.spot_requests FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_spot_requests_status ON public.spot_requests(status);
CREATE INDEX IF NOT EXISTS idx_spot_requests_expires ON public.spot_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_spot_requests_location ON public.spot_requests(latitude, longitude);

-- 00007: Ad clicks column (if not already applied)
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS clicks INT NOT NULL DEFAULT 0;

-- 00009: Fix contribution_stats FK errors
CREATE OR REPLACE FUNCTION public.ensure_user_exists(p_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO public.users (id, email)
  SELECT p_user_id, email
  FROM auth.users WHERE id = p_user_id
  ON CONFLICT (id) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.update_stats_on_spot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  SELECT NEW.user_id, email
  FROM auth.users WHERE id = NEW.user_id
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.contribution_stats (user_id, spots_posted, updated_at)
  VALUES (NEW.user_id, 1, now())
  ON CONFLICT (user_id) DO UPDATE SET
    spots_posted = contribution_stats.spots_posted + 1,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_stats_on_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hours NUMERIC(10,2);
BEGIN
  INSERT INTO public.users (id, email)
  SELECT OLD.user_id, email
  FROM auth.users WHERE id = OLD.user_id
  ON CONFLICT (id) DO NOTHING;

  hours := EXTRACT(EPOCH FROM (NEW.leaving_at - OLD.leaving_at)) / 3600;
  INSERT INTO public.contribution_stats (user_id, spots_claimed, hours_saved, updated_at)
  VALUES (OLD.user_id, 1, hours, now())
  ON CONFLICT (user_id) DO UPDATE SET
    spots_claimed = contribution_stats.spots_claimed + 1,
    hours_saved = contribution_stats.hours_saved + hours,
    updated_at = now();
  RETURN NEW;
END;
$$;
