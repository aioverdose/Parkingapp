-- Saved parking spots for users (Save My Spot feature)
CREATE TABLE IF NOT EXISTS public.user_parking_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Current Spot',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  accuracy NUMERIC(5, 2),
  saved_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_parking_spots_user ON public.user_parking_spots(user_id);

ALTER TABLE public.user_parking_spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own parking spots"
  ON public.user_parking_spots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own parking spots"
  ON public.user_parking_spots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own parking spots"
  ON public.user_parking_spots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own parking spots"
  ON public.user_parking_spots FOR DELETE
  USING (auth.uid() = user_id);
