-- Presence is independent from optional geolocation permission.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_last_seen_at
  ON public.users (last_seen_at)
  WHERE last_seen_at IS NOT NULL;
