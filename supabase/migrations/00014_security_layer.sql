-- Security layer: phone, ratings, flags, safety, pilot area, spot expiry

-- 1. Phone verification
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- 2. User ratings
CREATE TABLE IF NOT EXISTS public.user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rated_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rated_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  spot_id UUID REFERENCES public.parking_spots(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_ratings_rated ON public.user_ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_spot ON public.user_ratings(spot_id);

ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read user_ratings"
  ON public.user_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own ratings"
  ON public.user_ratings FOR INSERT
  WITH CHECK (auth.uid() = rated_by_user_id);

-- 3. Average rating on users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT 0;

-- Function to recalc average rating
CREATE OR REPLACE FUNCTION public.recalc_average_rating(rated_user_id UUID)
RETURNS NUMERIC(3,2) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_avg NUMERIC(3,2);
BEGIN
  SELECT COALESCE(AVG(rating)::NUMERIC(3,2), 0) INTO new_avg
  FROM public.user_ratings
  WHERE user_ratings.rated_user_id = recalc_average_rating.rated_user_id;

  UPDATE public.users
  SET average_rating = new_avg
  WHERE id = recalc_average_rating.rated_user_id;

  RETURN new_avg;
END;
$$;

-- Trigger to recalc on insert
CREATE OR REPLACE FUNCTION public.on_rating_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.recalc_average_rating(NEW.rated_user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_rating ON public.user_ratings;
CREATE TRIGGER trg_recalc_rating
  AFTER INSERT ON public.user_ratings
  FOR EACH ROW EXECUTE FUNCTION public.on_rating_insert();

-- 4. Spot flags
CREATE TABLE IF NOT EXISTS public.spot_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES public.parking_spots(id) ON DELETE CASCADE,
  flagged_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('wrong_location', 'fake_spot', 'rude_user', 'dangerous_behavior', 'other')),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spot_flags_spot ON public.spot_flags(spot_id);
CREATE INDEX IF NOT EXISTS idx_spot_flags_user ON public.spot_flags(flagged_by_user_id);

ALTER TABLE public.spot_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read spot_flags"
  ON public.spot_flags FOR SELECT
  USING (true);

CREATE POLICY "Users can insert spot_flags"
  ON public.spot_flags FOR INSERT
  WITH CHECK (auth.uid() = flagged_by_user_id);

-- 5. Flag count on users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0;

-- Function to update flag_count for a user (the spot owner)
CREATE OR REPLACE FUNCTION public.update_flag_count_for_spot_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  spot_owner_id UUID;
  new_count INTEGER;
BEGIN
  SELECT user_id INTO spot_owner_id FROM public.parking_spots WHERE id = NEW.spot_id;

  SELECT COUNT(*) INTO new_count
  FROM public.spot_flags sf
  JOIN public.parking_spots ps ON ps.id = sf.spot_id
  WHERE ps.user_id = spot_owner_id;

  UPDATE public.users SET flag_count = new_count WHERE id = spot_owner_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flag_count ON public.spot_flags;
CREATE TRIGGER trg_flag_count
  AFTER INSERT ON public.spot_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_flag_count_for_spot_owner();

-- 6. Safety acknowledgment
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS safety_acknowledged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS safety_acknowledged_at TIMESTAMPTZ;

-- 7. Spot expiry (60 min max)
ALTER TABLE public.parking_spots
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Set expires_at for existing rows (leaving_at + 60 min or now + 60 min)
UPDATE public.parking_spots
SET expires_at = COALESCE(leaving_at, created_at, now()) + INTERVAL '1 hour'
WHERE expires_at IS NULL;

-- Function to auto-set expires_at on insert
CREATE OR REPLACE FUNCTION public.set_spot_expiry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.expires_at := COALESCE(NEW.leaving_at, now()) + INTERVAL '1 hour';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_expiry ON public.parking_spots;
CREATE TRIGGER trg_set_expiry
  BEFORE INSERT ON public.parking_spots
  FOR EACH ROW EXECUTE FUNCTION public.set_spot_expiry();

-- 8. Pilot areas
CREATE TABLE IF NOT EXISTS public.pilot_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  min_lat NUMERIC(10,7) NOT NULL,
  max_lat NUMERIC(10,7) NOT NULL,
  min_lng NUMERIC(10,7) NOT NULL,
  max_lng NUMERIC(10,7) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pilot_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pilot_areas"
  ON public.pilot_areas FOR SELECT
  USING (true);

-- Admin can manage
CREATE POLICY "Admins can manage pilot_areas"
  ON public.pilot_areas FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert default pilot area (Arts District, Long Beach)
INSERT INTO public.pilot_areas (name, min_lat, max_lat, min_lng, max_lng)
VALUES ('Arts District Beta', 33.7700, 33.7800, -118.2000, -118.1900)
ON CONFLICT DO NOTHING;

-- 9. Expired spots view filter (exclude expired spots from queries)
CREATE OR REPLACE FUNCTION public.active_spots()
RETURNS SETOF public.parking_spots LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.parking_spots
  WHERE (expires_at IS NULL OR expires_at > now())
  AND status = 'active';
END;
$$;
