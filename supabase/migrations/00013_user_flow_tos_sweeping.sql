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
