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
