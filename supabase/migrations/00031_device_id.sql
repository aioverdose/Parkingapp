-- Device id: stable id generated on the user's device and reported with location pings

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS device_id TEXT;

COMMENT ON COLUMN public.users.device_id IS 'Stable device id generated client-side and reported via location pings';
