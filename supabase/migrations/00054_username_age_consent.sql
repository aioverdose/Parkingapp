-- Required pseudonymous identity and minimum-age attestation for new accounts.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS age_confirmed_at TIMESTAMPTZ;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_username_format;

ALTER TABLE public.users
  ADD CONSTRAINT users_username_format
  CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');

CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique
  ON public.users (lower(username))
  WHERE username IS NOT NULL;
