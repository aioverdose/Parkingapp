-- White-label branding for business subscribers.
--
-- Each business can brand the coordination experience it presents to its
-- members. All fields are optional; when unset, consumers see the platform
-- default (SpotMatch) branding.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT,
  ADD COLUMN IF NOT EXISTS accent_color TEXT,
  ADD COLUMN IF NOT EXISTS app_name TEXT;

COMMENT ON COLUMN public.businesses.logo_url IS 'Business logo for white-label surfaces';
COMMENT ON COLUMN public.businesses.primary_color IS 'Primary brand color (hex) for white-label surfaces';
COMMENT ON COLUMN public.businesses.accent_color IS 'Accent brand color (hex) for white-label surfaces';
COMMENT ON COLUMN public.businesses.app_name IS 'Custom app/experience name shown to this business network; defaults to business name';
