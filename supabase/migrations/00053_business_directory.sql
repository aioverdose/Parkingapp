-- Verified destination directory for business-aware SPOT arrival matching.
CREATE TABLE IF NOT EXISTS public.business_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('openstreetmap', 'nominatim', 'manual')),
  source_id TEXT NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  phone TEXT,
  website TEXT,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.700 CHECK (confidence >= 0 AND confidence <= 1),
  verified BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  source_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_business_directory_name ON public.business_directory (normalized_name);
CREATE INDEX IF NOT EXISTS idx_business_directory_location ON public.business_directory (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_business_directory_active ON public.business_directory (active, verified);

ALTER TABLE public.business_directory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can manage business directory" ON public.business_directory;
CREATE POLICY "Platform admins can manage business directory"
  ON public.business_directory FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.business_directory_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_directory_updated_at ON public.business_directory;
CREATE TRIGGER trg_business_directory_updated_at
  BEFORE UPDATE ON public.business_directory
  FOR EACH ROW EXECUTE FUNCTION public.business_directory_updated_at();
