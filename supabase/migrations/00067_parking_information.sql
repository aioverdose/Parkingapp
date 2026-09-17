CREATE TABLE IF NOT EXISTS public.parking_information (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_record_id UUID UNIQUE REFERENCES public.parking_research_records(id) ON DELETE SET NULL,
  city TEXT NOT NULL,
  state_country TEXT NOT NULL DEFAULT '',
  record_type TEXT NOT NULL CHECK (record_type IN ('sweeping', 'garage', 'ev', 'meter', 'rules')),
  name TEXT NOT NULL,
  address_area TEXT NOT NULL DEFAULT '',
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  hours TEXT NOT NULL DEFAULT '',
  pricing TEXT NOT NULL DEFAULT '',
  restrictions TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL,
  source_name TEXT NOT NULL DEFAULT '',
  confidence NUMERIC(4,3) CHECK (confidence >= 0 AND confidence <= 1),
  verified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'archived')),
  imported_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_parking_information_city_type ON public.parking_information(city, record_type, status);
ALTER TABLE public.parking_information ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published parking information is publicly readable" ON public.parking_information FOR SELECT USING (status = 'published');
REVOKE INSERT, UPDATE, DELETE ON public.parking_information FROM anon, authenticated;
