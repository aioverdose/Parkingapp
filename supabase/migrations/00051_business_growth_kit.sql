-- White-label business growth surfaces: customer-facing content and join attribution.
-- Join events are intentionally anonymous; they support aggregate business metrics
-- without creating a second customer identity system.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS welcome_message TEXT,
  ADD COLUMN IF NOT EXISTS house_notes TEXT,
  ADD COLUMN IF NOT EXISTS promo_text TEXT,
  ADD COLUMN IF NOT EXISTS info_link TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.business_join_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'link' CHECK (source IN ('qr', 'link')),
  event_type TEXT NOT NULL DEFAULT 'visit' CHECK (event_type IN ('visit', 'join', 'install')),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_join_events_business_time
  ON public.business_join_events (business_id, created_at DESC);

ALTER TABLE public.business_join_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can read join events"
  ON public.business_join_events FOR SELECT
  USING (public.is_platform_admin() OR public.current_user_business_role(business_id) IS NOT NULL);

CREATE POLICY "Business admins can create join events"
  ON public.business_join_events FOR INSERT
  WITH CHECK (public.is_platform_admin() OR public.current_user_business_role(business_id) = 'admin');

COMMENT ON TABLE public.business_join_events IS
  'Aggregate attribution for business join links and install prompts; not a reservation or parking guarantee.';
