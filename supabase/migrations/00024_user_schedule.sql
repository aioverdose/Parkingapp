-- Add schedule matching fields to users: typical arrival/departure times and days

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS schedule_arrival TIME,
  ADD COLUMN IF NOT EXISTS schedule_departure TIME,
  ADD COLUMN IF NOT EXISTS schedule_days INTEGER[] DEFAULT '{1,2,3,4,5}';

COMMENT ON COLUMN public.users.schedule_arrival IS 'Typical daily arrival time at regular parking location (24h)';
COMMENT ON COLUMN public.users.schedule_departure IS 'Typical daily departure time from regular parking location (24h)';
COMMENT ON COLUMN public.users.schedule_days IS 'Days of week user follows this schedule (0=Sun, 6=Sat)';
