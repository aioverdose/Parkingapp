-- Car location tracking: auto-detect when users park and walk back

CREATE TABLE IF NOT EXISTS public.car_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  parked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'parked' CHECK (status IN ('parked', 'walking_back', 'departed')),
  walking_eta_seconds INTEGER,
  walking_back_detected_at TIMESTAMPTZ,
  departed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_car_locations_active
  ON public.car_locations (user_id)
  WHERE status IN ('parked', 'walking_back');

CREATE INDEX IF NOT EXISTS idx_car_locations_user ON public.car_locations(user_id, status);

ALTER TABLE public.car_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own car locations"
  ON public.car_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own car locations"
  ON public.car_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own car locations"
  ON public.car_locations FOR UPDATE
  USING (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'car_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.car_locations;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_car_location_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_car_locations_updated_at
  BEFORE UPDATE ON public.car_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_car_location_updated_at();
