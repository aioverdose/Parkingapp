-- Expected business departure windows for operational coordination.
-- These are not reservations and never represent guaranteed parking.
CREATE TABLE IF NOT EXISTS public.business_known_departures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  network_id UUID REFERENCES public.networks(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN (
    'shift_end', 'closing_time', 'meal_turnover', 'class_end',
    'street_sweeping', 'event_end', 'staff_departure', 'other'
  )),
  title TEXT CHECK (title IS NULL OR char_length(title) <= 120),
  day_of_week SMALLINT[] CHECK (
    day_of_week IS NULL OR (
      cardinality(day_of_week) > 0 AND
      day_of_week <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[]
    )
  ),
  specific_date DATE,
  start_time TIME NOT NULL,
  end_time TIME,
  lead_minutes INTEGER CHECK (lead_minutes IS NULL OR lead_minutes BETWEEN 0 AND 1440),
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((specific_date IS NULL) <> (day_of_week IS NULL)),
  CHECK (end_time IS NULL OR end_time >= start_time)
);

CREATE INDEX IF NOT EXISTS idx_known_departures_business
  ON public.business_known_departures (business_id, active, start_time);

ALTER TABLE public.business_known_departures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can read known departures"
  ON public.business_known_departures FOR SELECT
  USING (public.is_platform_admin() OR public.current_user_business_role(business_id) IS NOT NULL);

CREATE POLICY "Business admins can create known departures"
  ON public.business_known_departures FOR INSERT
  WITH CHECK (public.is_platform_admin() OR public.current_user_business_role(business_id) = 'admin');

CREATE POLICY "Business admins can update known departures"
  ON public.business_known_departures FOR UPDATE
  USING (public.is_platform_admin() OR public.current_user_business_role(business_id) = 'admin')
  WITH CHECK (public.is_platform_admin() OR public.current_user_business_role(business_id) = 'admin');

CREATE POLICY "Business admins can delete known departures"
  ON public.business_known_departures FOR DELETE
  USING (public.is_platform_admin() OR public.current_user_business_role(business_id) = 'admin');

COMMENT ON TABLE public.business_known_departures IS
  'Expected departure windows for business coordination; not reservations or guaranteed parking';
