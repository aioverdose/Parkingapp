-- Handoff Coordination (Air Traffic Control)
-- Tracks which proximity announcements have been sent for a match so the
-- owner is notified exactly once as the arriving driver crosses each threshold.

ALTER TABLE public.active_sessions
  ADD COLUMN IF NOT EXISTS proximity_announced_km BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS proximity_announced_arrival BOOLEAN NOT NULL DEFAULT false;

-- Used by the schedule-based matching pass (air traffic control) to find
-- compatible spots/drivers by proximity.
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_location
  ON public.recurring_schedules(latitude, longitude);
