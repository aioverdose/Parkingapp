-- Multi-vehicle and long-range private schedule planner.

CREATE TABLE IF NOT EXISTS public.user_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT 'My vehicle',
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('compact', 'sedan', 'suv', 'truck', 'van', 'motorcycle')),
  make_model TEXT,
  color TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own vehicles" ON public.user_vehicles
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_user_vehicles_user ON public.user_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vehicles_active ON public.user_vehicles(user_id, active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_vehicles_one_primary
  ON public.user_vehicles(user_id) WHERE is_primary AND active;

ALTER TABLE public.recurring_schedules ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.recurring_schedules ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.recurring_schedules ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE public.recurring_schedules ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.user_vehicles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_dates ON public.recurring_schedules(user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_vehicle ON public.recurring_schedules(vehicle_id);

CREATE TABLE IF NOT EXISTS public.schedule_date_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.user_vehicles(id) ON DELETE SET NULL,
  saved_spot_id UUID REFERENCES public.user_parking_spots(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  label TEXT NOT NULL DEFAULT 'One-off schedule',
  schedule_date DATE NOT NULL,
  arrival_time TIME NOT NULL,
  departure_time TIME NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_date_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own date entries" ON public.schedule_date_entries
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_schedule_date_entries_user_date ON public.schedule_date_entries(user_id, schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedule_date_entries_active_date ON public.schedule_date_entries(active, schedule_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_date_entries_unique_slot
  ON public.schedule_date_entries(user_id, schedule_date, label, arrival_time, departure_time);
