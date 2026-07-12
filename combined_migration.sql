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


-- Add vehicle_type to users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS vehicle_type TEXT CHECK (vehicle_type IN ('compact', 'sedan', 'suv', 'truck', 'van', 'motorcycle'));

-- Add vehicle_type to parking_spots (what vehicle type the spot can fit, NULL = any)
ALTER TABLE public.parking_spots
ADD COLUMN IF NOT EXISTS vehicle_type TEXT CHECK (vehicle_type IN ('compact', 'sedan', 'suv', 'truck', 'van', 'motorcycle'));


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


-- Ephemeral spot handoff chats
CREATE TABLE IF NOT EXISTS public.ephemeral_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES public.parking_spots(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ephemeral_chats_spot ON public.ephemeral_chats(spot_id);
CREATE INDEX IF NOT EXISTS idx_ephemeral_chats_participants ON public.ephemeral_chats(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_ephemeral_chats_status ON public.ephemeral_chats(status);
CREATE INDEX IF NOT EXISTS idx_ephemeral_chats_expires ON public.ephemeral_chats(expires_at) WHERE status = 'active';

ALTER TABLE public.ephemeral_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read chat"
  ON public.ephemeral_chats FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Participants can insert chat"
  ON public.ephemeral_chats FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Participants can update chat"
  ON public.ephemeral_chats FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Ephemeral messages
CREATE TABLE IF NOT EXISTS public.ephemeral_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.ephemeral_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ephemeral_messages_chat ON public.ephemeral_messages(chat_id, created_at);

ALTER TABLE public.ephemeral_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants can read messages"
  ON public.ephemeral_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ephemeral_chats
      WHERE id = chat_id AND (auth.uid() = sender_id OR auth.uid() = receiver_id)
    )
  );

CREATE POLICY "Chat participants can insert messages"
  ON public.ephemeral_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ephemeral_chats
      WHERE id = chat_id AND (auth.uid() = sender_id OR auth.uid() = receiver_id)
    )
  );

-- Departure pings
CREATE TABLE IF NOT EXISTS public.departure_pings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters DOUBLE PRECISION NOT NULL DEFAULT 500,
  leaving_in_minutes INT NOT NULL CHECK (leaving_in_minutes IN (5, 10, 15)),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_departure_pings_user ON public.departure_pings(user_id);
CREATE INDEX IF NOT EXISTS idx_departure_pings_location ON public.departure_pings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_departure_pings_expires ON public.departure_pings(expires_at);

ALTER TABLE public.departure_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active departure pings"
  ON public.departure_pings FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Users can insert their own pings"
  ON public.departure_pings FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- TTL cleanup functions

-- Expire old ephemeral chats (active past expires_at or completed for > 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_ephemeral_chats()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.ephemeral_chats
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < now();

  DELETE FROM public.ephemeral_chats
  WHERE status IN ('completed', 'expired') AND closed_at < now() - INTERVAL '1 hour';
$$;

-- Expire old departure pings
CREATE OR REPLACE FUNCTION public.cleanup_departure_pings()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.departure_pings
  WHERE expires_at < now();
$$;

-- Streak maintenance: reset daily streaks for users with no activity
CREATE OR REPLACE FUNCTION public.maintain_streaks()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.contribution_stats
  SET
    streak_7d = CASE
      WHEN updated_at > now() - INTERVAL '2 days' THEN streak_7d + 1
      ELSE 0
    END,
    streak_30d = CASE
      WHEN updated_at > now() - INTERVAL '2 days' THEN streak_30d + 1
      ELSE 0
    END
  WHERE updated_at < now() - INTERVAL '1 day';
$$;

-- Trigger to auto-close chat when spot is claimed (handoff complete)
CREATE OR REPLACE FUNCTION public.auto_close_chat_on_claim()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.ephemeral_chats
  SET status = 'completed', closed_at = now()
  WHERE spot_id = NEW.id AND status = 'active';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_close_chat ON public.parking_spots;
CREATE TRIGGER trigger_auto_close_chat
  AFTER UPDATE OF status ON public.parking_spots
  FOR EACH ROW
  WHEN (OLD.status = 'active' AND NEW.status = 'taken')
  EXECUTE FUNCTION public.auto_close_chat_on_claim();

-- Trigger to update contribution_stats on new spot
CREATE OR REPLACE FUNCTION public.update_stats_on_spot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.contribution_stats (user_id, spots_posted, updated_at)
  VALUES (NEW.user_id, 1, now())
  ON CONFLICT (user_id) DO UPDATE SET
    spots_posted = contribution_stats.spots_posted + 1,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_stats_on_spot ON public.parking_spots;
CREATE TRIGGER trigger_update_stats_on_spot
  AFTER INSERT ON public.parking_spots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stats_on_spot();

-- Trigger to update contribution_stats on claim
CREATE OR REPLACE FUNCTION public.update_stats_on_claim()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  hours NUMERIC(10,2);
BEGIN
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

DROP TRIGGER IF EXISTS trigger_update_stats_on_claim ON public.parking_spots;
CREATE TRIGGER trigger_update_stats_on_claim
  AFTER UPDATE OF status ON public.parking_spots
  FOR EACH ROW
  WHEN (OLD.status = 'active' AND NEW.status = 'taken')
  EXECUTE FUNCTION public.update_stats_on_claim();


-- Role column on users (default: 'user', admin: 'admin', 'moderator')
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator'));

-- Ads table for local businesses and event promoters
CREATE TABLE IF NOT EXISTS public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT,
  link_url TEXT,
  business_name TEXT NOT NULL,
  tagline TEXT,
  target_lat DOUBLE PRECISION,
  target_lng DOUBLE PRECISION,
  target_radius_meters DOUBLE PRECISION,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  impressions INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active ads"
  ON public.ads FOR SELECT
  USING (active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date > now()));

CREATE POLICY "Admins can manage ads"
  ON public.ads FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE INDEX IF NOT EXISTS idx_ads_active ON public.ads(active);
CREATE INDEX IF NOT EXISTS idx_ads_dates ON public.ads(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ads_location ON public.ads(target_lat, target_lng) WHERE target_lat IS NOT NULL;


-- Add clicks column to ads table for tracking ad click-through rate
ALTER TABLE public.ads
ADD COLUMN IF NOT EXISTS clicks INT NOT NULL DEFAULT 0;


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


-- Ensure a public.users row exists for a given auth user
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

-- Ensure public.users row exists before updating contribution_stats
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


-- Agent tables for SpotMatch AI agents

-- 1. Congestion alerts: tracks tight parking zones
CREATE TABLE IF NOT EXISTS public.congestion_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neighborhood TEXT NOT NULL,
  alert_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_congestion_neighborhood ON public.congestion_alerts(neighborhood);
CREATE INDEX IF NOT EXISTS idx_congestion_created ON public.congestion_alerts(created_at);

ALTER TABLE public.congestion_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read congestion alerts"
  ON public.congestion_alerts FOR SELECT
  USING (true);

CREATE POLICY "Admin can insert congestion alerts"
  ON public.congestion_alerts FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

-- 2. Ad analytics: tracks ad impressions and clicks
CREATE TABLE IF NOT EXISTS public.ad_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_analytics_ad ON public.ad_analytics(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_created ON public.ad_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_event ON public.ad_analytics(event_type);

ALTER TABLE public.ad_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read ad analytics"
  ON public.ad_analytics FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

CREATE POLICY "System can insert ad analytics"
  ON public.ad_analytics FOR INSERT
  WITH CHECK (true);

-- 3. Spot predictions: AI-predicted spot openings
CREATE TABLE IF NOT EXISTS public.spot_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  predicted_lat DOUBLE PRECISION NOT NULL,
  predicted_lng DOUBLE PRECISION NOT NULL,
  predicted_time TIMESTAMPTZ NOT NULL,
  neighborhood TEXT,
  sent_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  converted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spot_predictions_time ON public.spot_predictions(predicted_time);
CREATE INDEX IF NOT EXISTS idx_spot_predictions_neighborhood ON public.spot_predictions(neighborhood);
CREATE INDEX IF NOT EXISTS idx_spot_predictions_converted ON public.spot_predictions(converted);

ALTER TABLE public.spot_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read spot predictions"
  ON public.spot_predictions FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

CREATE POLICY "System can insert spot predictions"
  ON public.spot_predictions FOR INSERT
  WITH CHECK (true);

-- 4. Invite conversions: tracks user invite effectiveness
CREATE TABLE IF NOT EXISTS public.invite_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invitee_phone TEXT,
  invited_via TEXT NOT NULL DEFAULT 'sms' CHECK (invited_via IN ('sms', 'share')),
  converted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_inviter ON public.invite_conversions(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invite_converted ON public.invite_conversions(converted);

ALTER TABLE public.invite_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read invites"
  ON public.invite_conversions FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

CREATE POLICY "System can insert invites"
  ON public.invite_conversions FOR INSERT
  WITH CHECK (true);

-- 5. Helper: ensure users table has role column for admin checks
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));


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


-- Location permission and TOS acceptance columns
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS tos_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tos_accepted_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS location_permission BOOLEAN DEFAULT false;

-- Street sweeping schedules
CREATE TABLE IF NOT EXISTS public.street_sweeping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  street_name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  day_of_week TEXT NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  zone TEXT DEFAULT '',
  holiday_exemptions TEXT[] DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_street_sweeping_name_city ON public.street_sweeping(street_name, city);

ALTER TABLE public.street_sweeping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read street_sweeping"
  ON public.street_sweeping FOR SELECT
  USING (true);

-- User street sweeping alerts
CREATE TABLE IF NOT EXISTS public.street_sweeping_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  street_name TEXT NOT NULL,
  alert_time TIMESTAMPTZ NOT NULL,
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sweeping_alerts_user ON public.street_sweeping_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_sweeping_alerts_notified ON public.street_sweeping_alerts(notified) WHERE notified = false;

ALTER TABLE public.street_sweeping_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sweeping alerts"
  ON public.street_sweeping_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sweeping alerts"
  ON public.street_sweeping_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sweeping alerts"
  ON public.street_sweeping_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sweeping alerts"
  ON public.street_sweeping_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Seed some Long Beach street sweeping data
INSERT INTO public.street_sweeping (street_name, city, day_of_week, time_start, time_end, zone) VALUES
  ('1st Street', 'Long Beach', 'Monday', '08:00', '10:00', 'Zone A'),
  ('1st Street', 'Long Beach', 'Thursday', '08:00', '10:00', 'Zone A'),
  ('2nd Street', 'Long Beach', 'Monday', '10:00', '12:00', 'Zone B'),
  ('2nd Street', 'Long Beach', 'Thursday', '10:00', '12:00', 'Zone B'),
  ('3rd Street', 'Long Beach', 'Tuesday', '08:00', '10:00', 'Zone C'),
  ('3rd Street', 'Long Beach', 'Friday', '08:00', '10:00', 'Zone C'),
  ('4th Street', 'Long Beach', 'Tuesday', '10:00', '12:00', 'Zone D'),
  ('4th Street', 'Long Beach', 'Friday', '10:00', '12:00', 'Zone D'),
  ('5th Street', 'Long Beach', 'Wednesday', '08:00', '10:00', 'Zone E'),
  ('5th Street', 'Long Beach', 'Saturday', '08:00', '10:00', 'Zone E'),
  ('6th Street', 'Long Beach', 'Wednesday', '10:00', '12:00', 'Zone F'),
  ('6th Street', 'Long Beach', 'Saturday', '10:00', '12:00', 'Zone F'),
  ('7th Street', 'Long Beach', 'Monday', '12:00', '14:00', 'Zone G'),
  ('7th Street', 'Long Beach', 'Thursday', '12:00', '14:00', 'Zone G'),
  ('8th Street', 'Long Beach', 'Tuesday', '12:00', '14:00', 'Zone H'),
  ('8th Street', 'Long Beach', 'Friday', '12:00', '14:00', 'Zone H'),
  ('9th Street', 'Long Beach', 'Wednesday', '12:00', '14:00', 'Zone I'),
  ('9th Street', 'Long Beach', 'Saturday', '12:00', '14:00', 'Zone I'),
  ('10th Street', 'Long Beach', 'Monday', '14:00', '16:00', 'Zone J'),
  ('10th Street', 'Long Beach', 'Thursday', '14:00', '16:00', 'Zone J'),
  ('Atlantic Avenue', 'Long Beach', 'Tuesday', '08:00', '10:00', 'Zone K'),
  ('Atlantic Avenue', 'Long Beach', 'Friday', '08:00', '10:00', 'Zone K'),
  ('Pacific Avenue', 'Long Beach', 'Wednesday', '08:00', '10:00', 'Zone L'),
  ('Pacific Avenue', 'Long Beach', 'Saturday', '08:00', '10:00', 'Zone L'),
  ('Ocean Boulevard', 'Long Beach', 'Monday', '06:00', '08:00', 'Zone M'),
  ('Ocean Boulevard', 'Long Beach', 'Thursday', '06:00', '08:00', 'Zone M'),
  ('Broadway', 'Long Beach', 'Tuesday', '06:00', '08:00', 'Zone N'),
  ('Broadway', 'Long Beach', 'Friday', '06:00', '08:00', 'Zone N'),
  ('Pine Avenue', 'Long Beach', 'Wednesday', '06:00', '08:00', 'Zone O'),
  ('Pine Avenue', 'Long Beach', 'Saturday', '06:00', '08:00', 'Zone O'),
  ('Linden Avenue', 'Long Beach', 'Monday', '08:00', '10:00', 'Zone P'),
  ('Linden Avenue', 'Long Beach', 'Thursday', '08:00', '10:00', 'Zone P')
ON CONFLICT DO NOTHING;


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


-- Course-based ranking system

-- 1. Courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  quiz_questions JSONB NOT NULL,
  points INTEGER NOT NULL DEFAULT 100,
  required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read courses"
  ON public.courses FOR SELECT
  USING (true);

-- 2. User course progress
CREATE TABLE IF NOT EXISTS public.user_course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'passed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  score INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE public.user_course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own course progress"
  ON public.user_course_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own course progress"
  ON public.user_course_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own course progress"
  ON public.user_course_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_course_progress_user ON public.user_course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_progress_course ON public.user_course_progress(course_id);

-- 3. User ranking
CREATE TABLE IF NOT EXISTS public.user_ranking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rank_tier TEXT NOT NULL DEFAULT 'bronze' CHECK (rank_tier IN ('bronze', 'silver', 'gold', 'community_partner')),
  rank_points INTEGER NOT NULL DEFAULT 0,
  trust_score NUMERIC(3,2) NOT NULL DEFAULT 5.00,
  courses_completed INTEGER NOT NULL DEFAULT 0,
  successful_handoffs INTEGER NOT NULL DEFAULT 0,
  flags_received INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_ranking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read user_ranking"
  ON public.user_ranking FOR SELECT
  USING (true);

CREATE POLICY "Users can update own ranking"
  ON public.user_ranking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_ranking_tier ON public.user_ranking(rank_tier);
CREATE INDEX IF NOT EXISTS idx_user_ranking_points ON public.user_ranking(rank_points DESC);

-- 4. Function to calculate rank tier based on courses, handoffs, flags
CREATE OR REPLACE FUNCTION public.calculate_rank_tier(
  p_courses_completed INTEGER,
  p_trust_score NUMERIC,
  p_flags_received INTEGER
) RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_courses_completed >= 4 AND p_trust_score >= 4.0 AND p_flags_received <= 1 THEN
    RETURN 'community_partner';
  ELSIF p_courses_completed >= 4 THEN
    RETURN 'gold';
  ELSIF p_courses_completed >= 2 THEN
    RETURN 'silver';
  ELSE
    RETURN 'bronze';
  END IF;
END;
$$;

-- 5. Function to update user_ranking when course is passed
CREATE OR REPLACE FUNCTION public.update_ranking_on_course_pass()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_courses_completed INTEGER;
  v_total_points INTEGER;
  v_trust_score NUMERIC(3,2);
  v_flags_received INTEGER;
  v_handoffs INTEGER;
  v_tier TEXT;
BEGIN
  -- Count courses completed
  SELECT COUNT(*) INTO v_courses_completed
  FROM public.user_course_progress
  WHERE user_id = NEW.user_id AND status = 'passed';

  -- Sum points from completed courses
  SELECT COALESCE(SUM(c.points), 0) INTO v_total_points
  FROM public.user_course_progress ucp
  JOIN public.courses c ON c.id = ucp.course_id
  WHERE ucp.user_id = NEW.user_id AND ucp.status = 'passed';

  -- Get existing ranking data
  SELECT COALESCE(trust_score, 5.0), COALESCE(flags_received, 0), COALESCE(successful_handoffs, 0)
  INTO v_trust_score, v_flags_received, v_handoffs
  FROM public.user_ranking
  WHERE user_id = NEW.user_id;

  -- Calculate trust score: starts at 5.0, -0.5 per flag, +0.1 per handoff (max 5.0)
  v_trust_score := LEAST(5.0, GREATEST(0.0, 5.0 - (v_flags_received * 0.5) + (v_handoffs * 0.1)));

  -- Determine tier
  v_tier := public.calculate_rank_tier(v_courses_completed, v_trust_score, v_flags_received);

  -- Upsert ranking
  INSERT INTO public.user_ranking (user_id, rank_tier, rank_points, trust_score, courses_completed, successful_handoffs, flags_received, updated_at)
  VALUES (NEW.user_id, v_tier, v_total_points, v_trust_score, v_courses_completed, v_handoffs, v_flags_received, now())
  ON CONFLICT (user_id) DO UPDATE SET
    rank_tier = EXCLUDED.rank_tier,
    rank_points = EXCLUDED.rank_points,
    trust_score = EXCLUDED.trust_score,
    courses_completed = EXCLUDED.courses_completed,
    successful_handoffs = EXCLUDED.successful_handoffs,
    flags_received = EXCLUDED.flags_received,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ranking_on_course_pass ON public.user_course_progress;
CREATE TRIGGER trg_ranking_on_course_pass
  AFTER INSERT OR UPDATE OF status ON public.user_course_progress
  FOR EACH ROW
  WHEN (NEW.status = 'passed')
  EXECUTE FUNCTION public.update_ranking_on_course_pass();

-- 6. Function to update ranking on handoff (spot claimed)
CREATE OR REPLACE FUNCTION public.update_ranking_on_handoff()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ranking RECORD;
  v_trust_score NUMERIC(3,2);
  v_tier TEXT;
  v_total_points INTEGER;
  v_courses_completed INTEGER;
BEGIN
  -- Only on successful claim
  IF NEW.status = 'taken' AND OLD.status = 'active' AND NEW.claimed_by IS DISTINCT FROM NULL THEN
    -- Get or create ranking for the spot owner
    INSERT INTO public.user_ranking (user_id, rank_points, trust_score, courses_completed, successful_handoffs, flags_received)
    VALUES (OLD.user_id, 0, 5.0, 0, 1, 0)
    ON CONFLICT (user_id) DO UPDATE SET
      successful_handoffs = user_ranking.successful_handoffs + 1,
      rank_points = user_ranking.rank_points + 10,
      updated_at = now()
    RETURNING * INTO v_ranking;

    -- Recalc trust score
    v_trust_score := LEAST(5.0, GREATEST(0.0, 5.0 - (v_ranking.flags_received * 0.5) + ((v_ranking.successful_handoffs + 1) * 0.1)));

    -- Get courses completed
    SELECT COUNT(*) INTO v_courses_completed
    FROM public.user_course_progress
    WHERE user_id = OLD.user_id AND status = 'passed';

    -- Get total points
    SELECT COALESCE(SUM(c.points), 0) + ((v_ranking.successful_handoffs + 1) * 10) INTO v_total_points
    FROM public.user_course_progress ucp
    JOIN public.courses c ON c.id = ucp.course_id
    WHERE ucp.user_id = OLD.user_id AND ucp.status = 'passed';

    -- Determine tier
    v_tier := public.calculate_rank_tier(v_courses_completed, v_trust_score, v_ranking.flags_received);

    UPDATE public.user_ranking
    SET rank_tier = v_tier,
        rank_points = v_total_points,
        trust_score = v_trust_score,
        updated_at = now()
    WHERE user_id = OLD.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ranking_on_handoff ON public.parking_spots;
CREATE TRIGGER trg_ranking_on_handoff
  AFTER UPDATE OF status ON public.parking_spots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ranking_on_handoff();

-- 7. Function to update ranking on flag
CREATE OR REPLACE FUNCTION public.update_ranking_on_flag()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_spot_owner_id UUID;
  v_ranking RECORD;
  v_trust_score NUMERIC(3,2);
  v_tier TEXT;
  v_total_points INTEGER;
  v_courses_completed INTEGER;
  v_flags INTEGER;
BEGIN
  -- Get spot owner
  SELECT user_id INTO v_spot_owner_id FROM public.parking_spots WHERE id = NEW.spot_id;

  -- Get or create ranking
  INSERT INTO public.user_ranking (user_id, rank_points, trust_score, courses_completed, successful_handoffs, flags_received)
  VALUES (v_spot_owner_id, 0, 5.0, 0, 0, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    flags_received = user_ranking.flags_received + 1,
    rank_points = GREATEST(0, user_ranking.rank_points - 20),
    updated_at = now()
  RETURNING * INTO v_ranking;

  -- Recalc trust score
  v_flags := v_ranking.flags_received + 1;
  v_trust_score := LEAST(5.0, GREATEST(0.0, 5.0 - (v_flags * 0.5) + (v_ranking.successful_handoffs * 0.1)));

  -- Get courses completed
  SELECT COUNT(*) INTO v_courses_completed
  FROM public.user_course_progress
  WHERE user_id = v_spot_owner_id AND status = 'passed';

  -- Get total points
  SELECT COALESCE(SUM(c.points), 0) + (v_ranking.successful_handoffs * 10) - (v_flags * 20) INTO v_total_points
  FROM public.user_course_progress ucp
  JOIN public.courses c ON c.id = ucp.course_id
  WHERE ucp.user_id = v_spot_owner_id AND ucp.status = 'passed';
  v_total_points := GREATEST(0, v_total_points);

  -- Determine tier
  v_tier := public.calculate_rank_tier(v_courses_completed, v_trust_score, v_flags);

  UPDATE public.user_ranking
  SET rank_tier = v_tier,
      rank_points = v_total_points,
      trust_score = v_trust_score,
      flags_received = v_flags,
      updated_at = now()
  WHERE user_id = v_spot_owner_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ranking_on_flag ON public.spot_flags;
CREATE TRIGGER trg_ranking_on_flag
  AFTER INSERT ON public.spot_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ranking_on_flag();

-- 8. Seed courses
INSERT INTO public.courses (title, description, content, quiz_questions, points, required) VALUES
(
  'Street Parking Law & City Rules',
  'Learn the legal basics of street parking and how this app works within the law.',
  E'## Street Parking Law & City Rules\n\n### Public Street Parking\nPublic street parking spaces are **public property**. They cannot be bought, sold, or reserved. Anyone has the right to park in an empty public space on a first-come, first-served basis.\n\n### What This App Is (And Is Not)\nThis app is an **imminent departure alert** system. It lets you notify others when you are about to leave a parking spot. It is **not** a reservation system, a spot-selling platform, or a way to hold spots.\n\n### Rules You Must Follow\n- You may only post an alert when you are actually parked in the spot and about to leave\n- You cannot post alerts for spots you do not occupy\n- You cannot accept money or payment for a parking space\n- Alerts are limited to 15 minutes maximum to prevent early-arrival behavior\n- Your alert expires after the lead time and is automatically removed\n\n### Why These Rules Matter\nThese rules keep parking fair for everyone. When people treat public spaces as private property, it creates conflict and undermines community trust.',
  '[{"question":"Can you legally sell a public street parking space?","options":["Yes, if you parked there first","No, public street parking cannot be bought or sold","Yes, with a permit from the city","Only during street sweeping hours"],"correct":1},{"question":"What is this app designed for?","options":["Reserving parking spots in advance","Buying and selling parking spaces","Imminent departure alerts","Reporting parking violations"],"correct":2},{"question":"What is the maximum lead time for a departure alert?","options":["5 minutes","15 minutes","30 minutes","60 minutes"],"correct":1},{"question":"Can you post an alert for a spot you do not occupy?","options":["Yes, if I know someone is leaving","Yes, it helps the community","No, you must be parked in the spot","Only if I have a permit"],"correct":2}]'::jsonb,
  100,
  true
),
(
  'Community Safety & Neighbors',
  'Learn how to be a respectful and safe community member when using the app.',
  E'## Community Safety & Neighbors\n\n### Respecting Neighborhoods\nWhen you arrive to claim a spot, you are entering someone else\'s neighborhood. Your behavior reflects on the entire community of app users.\n\n### Safe Practices\n- **Do not wait near someone\'s home.** If you arrive early, park elsewhere and walk.\n- **Do not circle the block.** Repeated driving around a block looks suspicious and disturbs residents.\n- **Do not block driveways, fire hydrants, or sidewalks.** These are illegal and dangerous.\n- **Stay in your vehicle** while waiting for the spot to become free.\n- **Keep interactions brief.** A wave or a quick thank-you is enough.\n\n### Building Trust\nTrust is the foundation of this community. Users who follow these rules earn higher trust scores and ranking tiers, unlocking more features.',
  '[{"question":"What should you do if you arrive early for a spot?","options":["Park nearby and wait in your vehicle","Circle the block slowly","Wait right in front of the spot","Honk to let them know you are there"],"correct":0},{"question":"Is it okay to block a driveway while waiting for a spot?","options":["Yes, if I will only be a minute","Yes, if the spot is right next to it","No, it is illegal and dangerous","Only with the homeowner permission"],"correct":2},{"question":"What is the best way to interact with the person leaving the spot?","options":["Get out and have a conversation","A wave or quick thank-you","Follow them to their car","Ask them personal questions"],"correct":1},{"question":"Why should you not circle the block?","options":["It wastes gas","It looks suspicious and disturbs residents","It is illegal","It confuses other drivers"],"correct":1}]'::jsonb,
  100,
  true
),
(
  'App Risks & Best Practices',
  'Understand the risks of using community-driven parking apps and how to protect yourself.',
  E'## App Risks & Best Practices\n\n### Common Risks\nLike any community-driven platform, this app has risks:\n- **Fake spots:** Someone may post a spot that does not exist\n- **Stale data:** A spot may already be taken by the time you arrive\n- **Trolling:** Users may post misleading information\n- **Bad actors:** Some users may not follow the rules\n\n### How We Mitigate These Risks\n- **Short lead times (5-15 minutes):** Fresh alerts only. Old alerts expire quickly.\n- **Flag system:** You can flag misleading or dangerous spots, which reduces the poster trust score.\n- **Ranking system:** Trusted users earn higher ranks and visibility.\n- **Rate limiting:** Prevents spam and abuse.\n\n### Best Practices for You\n- Always verify the spot before claiming\n- Do not rely solely on the app — look for physical cues (car in spot, person leaving)\n- Report suspicious behavior using the flag system\n- Complete courses to earn higher trust and unlock features\n- Keep your app updated for the latest safety features',
  '[{"question":"What is a common risk of community parking apps?","options":["The app might crash","Fake or misleading spot alerts","Parking tickets","Battery drain"],"correct":1},{"question":"How does the app protect against stale data?","options":["It sends email reminders","Short lead times (5-15 minutes) with auto-expiration","It requires phone verification","It uses AI to predict availability"],"correct":1},{"question":"What should you do if you see a suspicious spot?","options":["Ignore it","Flag it using the report system","Post your own spot nearby","Leave the app"],"correct":1},{"question":"Why are short lead times important?","options":["They keep the app popular","They ensure alerts are fresh and relevant","They save server costs","They make the app faster"],"correct":1}]'::jsonb,
  100,
  false
),
(
  'Privacy & Location',
  'Learn how your data is used and how to protect your privacy while using the app.',
  E'## Privacy & Location\n\n### How Your Data Is Used\nThis app uses your location to show nearby parking spots and let you post departure alerts. Your precise location is:\n- Used only while the app is active\n- Shared at the block level (not your exact address)\n- Never sold or shared with third parties\n- Deleted when you delete your account\n\n### What Not to Share\n- **Do not share personal information** in tip messages or chat\n- **Do not share your phone number, address, or email** with other users\n- **Do not post photos** of license plates, faces, or identifying details\n\n### Privacy Best Practices\n- Use a display name that is not your real name\n- Disable location when not using the app\n- Review your data in settings periodically\n- Report any user who asks for personal information',
  '[{"question":"How is your precise location shared in the app?","options":["Your exact GPS coordinates are public","At the block level, not exact address","Only with law enforcement","It is never shared"],"correct":1},{"question":"Can you share your phone number with another user?","options":["Yes, to coordinate the handoff","No, it violates privacy guidelines","Only if they ask nicely","Yes, after completing all courses"],"correct":1},{"question":"What should you avoid including in tip messages?","options":["Your parking preferences","Personal information like your phone number or address","Directions to the spot","The vehicle type"],"correct":1}]'::jsonb,
  100,
  false
),
(
  'Street Sweeping & Legal Parking',
  'Learn about street sweeping rules in Long Beach and how to avoid tickets.',
  E'## Street Sweeping & Legal Parking\n\n### Long Beach Street Sweeping\nLong Beach has regular street sweeping on designated days. Signs are posted on each block indicating the schedule.\n\n### Common Rules\n- Street sweeping is typically once or twice per week per side of the street\n- Parking is prohibited during posted sweeping hours (usually 2-3 hour windows)\n- Violations result in fines (typically $40-$60)\n- Vehicles must be moved to the opposite side or another legal parking location\n\n### Avoiding Tickets\n- Check street sweeping signs before parking\n- Use the Street Sweeping Alert feature in this app\n- Set reminders for sweeping days in your area\n- Note that sweeping schedules change — check periodically\n\n### Legal Parking Tips\n- Always park within 18 inches of the curb\n- Do not park within 15 feet of a fire hydrant\n- Do not park in red, white, or blue zones\n- Check for time-limited parking signs\n- Residential permit parking areas require a permit during posted hours',
  '[{"question":"How often does street sweeping typically occur on each side?","options":["Once a month","Once or twice per week","Every day","Only on weekends"],"correct":1},{"question":"What is a typical fine for a street sweeping violation?","options":["$20-$30","$40-$60","$100-$150","$200-$300"],"correct":1},{"question":"How far from the curb should you park?","options":["6 inches","12 inches","18 inches","24 inches"],"correct":2},{"question":"What should you use to track street sweeping schedules?","options":["The city website only","The app Street Sweeping Alert feature","A calendar reminder","All of the above"],"correct":1}]'::jsonb,
  100,
  false
)
ON CONFLICT DO NOTHING;

-- 9. Function to create default ranking on user signup
CREATE OR REPLACE FUNCTION public.init_user_ranking()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_ranking (user_id, rank_tier, rank_points, trust_score, courses_completed, successful_handoffs, flags_received)
  VALUES (NEW.id, 'bronze', 0, 5.0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_init_ranking ON public.users;
CREATE TRIGGER trg_init_ranking
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.init_user_ranking();


-- SpotMatch: rename leaving_at to departure_time, add return_time, add spot_matches table

ALTER TABLE parking_spots RENAME COLUMN leaving_at TO departure_time;

ALTER TABLE parking_spots ADD COLUMN IF NOT EXISTS return_time TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS spot_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES parking_spots(id) ON DELETE CASCADE,
  spot_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seeker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed_by_owner', 'confirmed_by_seeker', 'confirmed', 'rejected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spot_matches_spot_id ON spot_matches(spot_id);
CREATE INDEX IF NOT EXISTS idx_spot_matches_seeker_id ON spot_matches(seeker_id);
CREATE INDEX IF NOT EXISTS idx_spot_matches_status ON spot_matches(status);

-- Auto-update updated_at on spot_matches
CREATE OR REPLACE FUNCTION update_spot_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_spot_matches_updated_at
  BEFORE UPDATE ON spot_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_spot_matches_updated_at();

-- Notify seeker on match creation
CREATE OR REPLACE FUNCTION notify_match_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type)
  VALUES
    (NEW.seeker_id, 'Match found!', 'A spot matching your needs is available. Confirm to claim it.', 'match'),
    (NEW.spot_owner_id, 'Match found!', 'Someone wants your spot. Confirm the match to proceed.', 'match');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_match_created
  AFTER INSERT ON spot_matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_match_created();

-- Notify both parties on confirmation
CREATE OR REPLACE FUNCTION notify_match_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES
      (NEW.seeker_id, 'Match confirmed!', 'Your match is confirmed. Chat with the spot owner to coordinate.', 'match'),
      (NEW.spot_owner_id, 'Match confirmed!', 'Your match is confirmed. Chat with the driver to coordinate.', 'match');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_match_confirmed
  AFTER UPDATE ON spot_matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_match_confirmed();


