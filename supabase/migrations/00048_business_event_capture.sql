-- Minimal anonymized event foundation for future local parking pattern analysis.
-- This records business/network outcomes only; it does not store user identity,
-- precise coordinates, or movement history.

CREATE TABLE IF NOT EXISTS public.business_handoff_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  network_id UUID REFERENCES public.networks(id) ON DELETE SET NULL,
  spot_id UUID REFERENCES public.parking_spots(id) ON DELETE SET NULL,
  match_id UUID REFERENCES public.spot_matches(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  daypart TEXT NOT NULL CHECK (daypart IN ('overnight', 'morning', 'afternoon', 'evening', 'late_night')),
  outcome TEXT NOT NULL CHECK (outcome IN (
    'departure',
    'offered',
    'accepted',
    'expired',
    'declined',
    'no_show',
    'completed'
  )),
  event_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_handoff_events_business_time
  ON public.business_handoff_events (business_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_business_handoff_events_network_time
  ON public.business_handoff_events (network_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_business_handoff_events_outcome_time
  ON public.business_handoff_events (outcome, occurred_at DESC);

ALTER TABLE public.business_handoff_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can read own event history"
  ON public.business_handoff_events FOR SELECT
  USING (
    public.is_platform_admin()
    OR public.current_user_business_role(business_id) IS NOT NULL
  );

CREATE OR REPLACE FUNCTION public.business_event_daypart(
  p_occurred_at TIMESTAMPTZ,
  p_business_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hour INTEGER;
  v_timezone TEXT;
BEGIN
  SELECT timezone INTO v_timezone
  FROM public.businesses
  WHERE id = p_business_id;

  v_hour := EXTRACT(HOUR FROM p_occurred_at AT TIME ZONE COALESCE(v_timezone, 'America/Los_Angeles'));

  RETURN CASE
    WHEN v_hour < 6 THEN 'overnight'
    WHEN v_hour < 12 THEN 'morning'
    WHEN v_hour < 17 THEN 'afternoon'
    WHEN v_hour < 22 THEN 'evening'
    ELSE 'late_night'
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_business_handoff_event(
  p_business_id UUID,
  p_network_id UUID,
  p_spot_id UUID,
  p_match_id UUID,
  p_occurred_at TIMESTAMPTZ,
  p_outcome TEXT,
  p_event_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_business_id IS NULL OR p_outcome IS NULL OR p_event_key IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.business_handoff_events (
    business_id,
    network_id,
    spot_id,
    match_id,
    occurred_at,
    daypart,
    outcome,
    event_key
  )
  VALUES (
    p_business_id,
    p_network_id,
    p_spot_id,
    p_match_id,
    COALESCE(p_occurred_at, now()),
    public.business_event_daypart(COALESCE(p_occurred_at, now()), p_business_id),
    p_outcome,
    p_event_key
  )
  ON CONFLICT (event_key) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_business_spot_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.business_id IS NOT NULL THEN
    PERFORM public.record_business_handoff_event(
      NEW.business_id,
      NEW.network_id,
      NEW.id,
      NULL,
      COALESCE(NEW.created_at, now()),
      'departure',
      'spot:' || NEW.id::TEXT || ':departure'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_business_spot_event ON public.parking_spots;
CREATE TRIGGER trg_capture_business_spot_event
  AFTER INSERT ON public.parking_spots
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_business_spot_event();

CREATE OR REPLACE FUNCTION public.capture_business_match_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outcome TEXT;
BEGIN
  IF NEW.business_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.status = 'offered' THEN
    v_outcome := 'offered';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_outcome := CASE NEW.status
      WHEN 'confirmed_by_seeker' THEN 'accepted'
      WHEN 'offer_declined' THEN 'declined'
      WHEN 'offer_expired' THEN 'expired'
      WHEN 'completed' THEN 'completed'
      ELSE NULL
    END;
  END IF;

  IF v_outcome IS NOT NULL THEN
    PERFORM public.record_business_handoff_event(
      NEW.business_id,
      NEW.network_id,
      NEW.spot_id,
      NEW.id,
      COALESCE(NEW.updated_at, NEW.created_at, now()),
      v_outcome,
      'match:' || NEW.id::TEXT || ':' || v_outcome
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_business_match_event ON public.spot_matches;
CREATE TRIGGER trg_capture_business_match_event
  AFTER INSERT OR UPDATE OF status ON public.spot_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_business_match_event();

CREATE OR REPLACE FUNCTION public.capture_business_no_show_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
  v_network_id UUID;
BEGIN
  IF NEW.status = 'no_show' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT business_id, network_id
    INTO v_business_id, v_network_id
    FROM public.spot_matches
    WHERE id = NEW.match_id;

    IF v_business_id IS NOT NULL THEN
      PERFORM public.record_business_handoff_event(
        v_business_id,
        v_network_id,
        NULL,
        NEW.match_id,
        COALESCE(NEW.updated_at, NEW.created_at, now()),
        'no_show',
        'match:' || NEW.match_id::TEXT || ':no_show'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_business_no_show_event ON public.active_sessions;
CREATE TRIGGER trg_capture_business_no_show_event
  AFTER UPDATE OF status ON public.active_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_business_no_show_event();

COMMENT ON TABLE public.business_handoff_events IS
  'Anonymized business/network coordination outcomes for future local pattern analysis';
