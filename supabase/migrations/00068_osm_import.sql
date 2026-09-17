CREATE TABLE IF NOT EXISTS public.parking_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider TEXT NOT NULL DEFAULT 'osm' CHECK (provider = 'osm'),
  requested_by_admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  city TEXT NOT NULL, region TEXT NOT NULL DEFAULT '', country TEXT NOT NULL, selected_place_name TEXT NOT NULL,
  boundary JSONB NOT NULL, boundary_area_km2 NUMERIC(12,3), import_options JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_query TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','fetching','normalizing','deduplicating','ready_for_review','publishing','completed','failed','cancelled')),
  fetched_count INTEGER NOT NULL DEFAULT 0, staged_count INTEGER NOT NULL DEFAULT 0, approved_count INTEGER NOT NULL DEFAULT 0, published_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS public.parking_external_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider TEXT NOT NULL DEFAULT 'osm' CHECK (provider = 'osm'), osm_type TEXT NOT NULL CHECK (osm_type IN ('node','way','relation')), osm_id BIGINT NOT NULL, osm_version INTEGER,
  source_url TEXT NOT NULL, raw_tags JSONB NOT NULL DEFAULT '{}'::jsonb, raw_geometry JSONB, retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(), attribution_required BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(provider, osm_type, osm_id)
);
CREATE TABLE IF NOT EXISTS public.parking_import_staged_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL REFERENCES public.parking_import_jobs(id) ON DELETE CASCADE, external_source_id UUID NOT NULL REFERENCES public.parking_external_sources(id) ON DELETE RESTRICT,
  name TEXT NOT NULL DEFAULT '', operator TEXT NOT NULL DEFAULT '', parking_type TEXT NOT NULL DEFAULT 'unknown' CHECK (parking_type IN ('surface','underground','multi_storey','street_side','lane','garage','parking_space','motorcycle','unknown')),
  geometry JSONB NOT NULL, centroid_lat NUMERIC(10,7) NOT NULL, centroid_lng NUMERIC(10,7) NOT NULL, capacity INTEGER, access TEXT NOT NULL DEFAULT 'unknown' CHECK (access IN ('public','customers','permit','private','employees','residents','unknown')),
  fee TEXT NOT NULL DEFAULT 'unknown' CHECK (fee IN ('yes','no','unknown')), opening_hours TEXT NOT NULL DEFAULT '', vehicle_restrictions JSONB NOT NULL DEFAULT '{}'::jsonb, amenities JSONB NOT NULL DEFAULT '{}'::jsonb,
  data_confidence TEXT NOT NULL DEFAULT 'reference' CHECK (data_confidence IN ('reference','community_confirmed','operator_verified')), import_status TEXT NOT NULL DEFAULT 'staged' CHECK (import_status IN ('staged','approved','rejected','archived','needs_review')),
  visibility TEXT NOT NULL DEFAULT 'public_reference' CHECK (visibility IN ('public_reference','restricted_reference','admin_only')), duplicate_confidence NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (duplicate_confidence >= 0 AND duplicate_confidence <= 1), duplicate_of_id UUID REFERENCES public.parking_import_staged_records(id) ON DELETE SET NULL,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(job_id, external_source_id)
);
CREATE TABLE IF NOT EXISTS public.parking_import_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL REFERENCES public.parking_import_jobs(id) ON DELETE CASCADE, staged_record_id UUID NOT NULL REFERENCES public.parking_import_staged_records(id) ON DELETE CASCADE, reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('approve','reject','edit','merge','archive','flag')), reason TEXT NOT NULL CHECK (length(btrim(reason)) > 0), previous_value JSONB, new_value JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.parking_import_attributions (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id), display TEXT NOT NULL DEFAULT 'OpenStreetMap contributors', license TEXT NOT NULL DEFAULT 'ODbL 1.0', source_url TEXT NOT NULL DEFAULT 'https://www.openstreetmap.org/copyright', required_placement TEXT NOT NULL DEFAULT 'With public OSM-derived parking data', updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.parking_import_attributions (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.parking_import_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id), max_area_km2 NUMERIC(12,3) NOT NULL DEFAULT 250, hard_max_area_km2 NUMERIC(12,3) NOT NULL DEFAULT 1000, chunk_size INTEGER NOT NULL DEFAULT 50, overpass_rate_limit_seconds NUMERIC(6,2) NOT NULL DEFAULT 2, refresh_days INTEGER NOT NULL DEFAULT 30, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.parking_import_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.parking_information ADD COLUMN IF NOT EXISTS source_provider TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE public.parking_information ADD COLUMN IF NOT EXISTS external_source_id UUID REFERENCES public.parking_external_sources(id) ON DELETE SET NULL;
ALTER TABLE public.parking_information ADD COLUMN IF NOT EXISTS data_confidence TEXT NOT NULL DEFAULT 'reference' CHECK (data_confidence IN ('reference','community_confirmed','operator_verified'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_parking_information_external_source ON public.parking_information(external_source_id);
CREATE INDEX IF NOT EXISTS idx_osm_jobs_status ON public.parking_import_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_osm_staged_job_status ON public.parking_import_staged_records(job_id, import_status);
CREATE INDEX IF NOT EXISTS idx_osm_staged_centroid ON public.parking_import_staged_records(centroid_lat, centroid_lng);
CREATE INDEX IF NOT EXISTS idx_osm_reviews_job ON public.parking_import_reviews(job_id, created_at DESC);
ALTER TABLE public.parking_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_external_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_import_staged_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_import_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_import_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_import_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.parking_import_jobs, public.parking_external_sources, public.parking_import_staged_records, public.parking_import_reviews, public.parking_import_attributions, public.parking_import_settings FROM anon, authenticated;
