-- Spot requests: users looking for a parking spot
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
