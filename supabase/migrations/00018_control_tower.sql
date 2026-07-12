-- Control Tower: real-time GPS tracking for active matches

CREATE TABLE IF NOT EXISTS public.driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.spot_matches(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  heading REAL,
  speed REAL,
  accuracy REAL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_locations_user ON public.driver_locations(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_match ON public.driver_locations(match_id, recorded_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.driver_locations;

CREATE TABLE IF NOT EXISTS public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.spot_matches(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'seeker')),
  status TEXT NOT NULL DEFAULT 'en_route' CHECK (status IN ('en_route', 'arrived', 'departed', 'no_show', 'completed')),
  eta_seconds INTEGER,
  grace_period_ends_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  departed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_match ON public.active_sessions(match_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON public.active_sessions(user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.active_sessions;
