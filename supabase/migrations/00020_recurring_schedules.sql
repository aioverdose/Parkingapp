-- Recurring schedules: auto-list spots on a recurring basis

CREATE TABLE IF NOT EXISTS recurring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_spot_id UUID REFERENCES user_parking_spots(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  label TEXT,
  days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  departure_time TIME NOT NULL,
  return_time TIME NOT NULL,
  vehicle_type TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own schedules"
  ON recurring_schedules
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_recurring_schedules_user ON recurring_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_active ON recurring_schedules(active);
