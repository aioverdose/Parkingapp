CREATE TABLE IF NOT EXISTS public.parking_research_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL CHECK (char_length(city) BETWEEN 1 AND 160),
  state_country TEXT NOT NULL DEFAULT '',
  requested_types TEXT[] NOT NULL CHECK (cardinality(requested_types) > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'imported', 'failed')),
  query TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parking_research_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.parking_research_jobs(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('sweeping', 'garage', 'ev', 'meter', 'rules')),
  name TEXT NOT NULL,
  address_area TEXT NOT NULL DEFAULT '',
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  hours TEXT NOT NULL DEFAULT '',
  pricing TEXT NOT NULL DEFAULT '',
  restrictions TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL,
  source_name TEXT NOT NULL DEFAULT '',
  confidence NUMERIC(4,3) CHECK (confidence >= 0 AND confidence <= 1),
  verified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parking_research_jobs_created ON public.parking_research_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parking_research_records_job ON public.parking_research_records(job_id, status);
ALTER TABLE public.parking_research_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_research_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.parking_research_jobs FROM anon, authenticated;
REVOKE ALL ON public.parking_research_records FROM anon, authenticated;

-- Archive is a moderation state, not a public feed state.
ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS community_posts_status_check;
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_status_check CHECK (status IN ('published', 'held', 'deleted', 'archived'));
