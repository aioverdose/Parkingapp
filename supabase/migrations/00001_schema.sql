-- SpotMatch Schema Migration
-- Run this in your Supabase SQL editor

-- 1. Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- 2. Parking spots
CREATE TABLE IF NOT EXISTS public.parking_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT NOT NULL,
  leaving_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'taken', 'expired')),
  tip_message TEXT,
  claimed_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_parking_spots_status ON public.parking_spots(status);
CREATE INDEX idx_parking_spots_leaving_at ON public.parking_spots(leaving_at);
CREATE INDEX idx_parking_spots_user_id ON public.parking_spots(user_id);

ALTER TABLE public.parking_spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active spots"
  ON public.parking_spots FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users can insert their own spots"
  ON public.parking_spots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spots"
  ON public.parking_spots FOR UPDATE
  USING (auth.uid() = user_id);

-- 3. Tips
CREATE TABLE IF NOT EXISTS public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES public.parking_spots(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount IN (1, 2, 5)),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert tips"
  ON public.tips FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can read tips they sent or received"
  ON public.tips FOR SELECT
  USING (
    auth.uid() = sender_id OR
    auth.uid() IN (SELECT user_id FROM public.parking_spots WHERE id = spot_id)
  );

-- 4. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Auto-expire past spots function
CREATE OR REPLACE FUNCTION public.expire_past_spots()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.parking_spots
  SET status = 'expired'
  WHERE status = 'active' AND leaving_at < now();
$$;

-- You can set up a cron job to call this periodically:
-- select cron.schedule('expire-spots', '* * * * *', 'select public.expire_past_spots()');
