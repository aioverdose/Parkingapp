-- Private consultant Client Files foundation.

CREATE TABLE IF NOT EXISTS public.client_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_reference TEXT NOT NULL UNIQUE DEFAULT ('CF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  display_name TEXT NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 160),
  legal_organization_name TEXT,
  client_type TEXT NOT NULL DEFAULT 'Other',
  relationship_status TEXT NOT NULL DEFAULT 'Researching',
  engagement_status TEXT NOT NULL DEFAULT 'Not started',
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  confidentiality_level TEXT NOT NULL DEFAULT 'Confidential' CHECK (confidentiality_level IN ('Internal', 'Confidential', 'Restricted', 'Attorney review needed', 'Sensitive location/data')),
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  city TEXT,
  region TEXT,
  country TEXT DEFAULT 'United States',
  primary_time_zone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  study_area_name TEXT,
  study_area_type TEXT,
  study_boundary_notes TEXT,
  address_or_general_location TEXT,
  latitude DOUBLE PRECISION CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  map_privacy_level TEXT NOT NULL DEFAULT 'approximate' CHECK (map_privacy_level IN ('hidden', 'approximate', 'internal precise')),
  primary_parking_challenge TEXT,
  initial_problem_statement TEXT,
  initial_hypothesis TEXT,
  source_of_lead TEXT,
  lead_date DATE,
  discovery_date DATE,
  last_contacted_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.client_file_access (
  client_file_id UUID NOT NULL REFERENCES public.client_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  access_role TEXT NOT NULL DEFAULT 'consultant' CHECK (access_role IN ('owner', 'consultant', 'researcher', 'partner', 'read_only')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_file_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.client_file_intakes (
  client_file_id UUID PRIMARY KEY REFERENCES public.client_files(id) ON DELETE CASCADE,
  primary_contact_name TEXT,
  primary_contact_role TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  decision_maker_contact TEXT,
  operational_contact TEXT,
  known_peak_periods TEXT,
  known_upcoming_events TEXT,
  existing_solutions TEXT,
  known_stakeholders TEXT,
  known_constraints TEXT,
  known_data_sources TEXT,
  why_relevant TEXT,
  validation_questions TEXT,
  potential_first_engagement TEXT,
  budget_signal TEXT,
  procurement_signal TEXT,
  client_urgency TEXT,
  decision_timeline TEXT,
  success_definition TEXT,
  internal_notes TEXT,
  evidence_label TEXT NOT NULL DEFAULT 'Reported' CHECK (evidence_label IN ('Observed', 'Reported', 'Official', 'Estimated', 'Forecast', 'Proposed', 'Requires validation')),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_file_id UUID NOT NULL REFERENCES public.client_files(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  time_zone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  observer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  study_area TEXT,
  conditions TEXT,
  raw_notes TEXT NOT NULL DEFAULT '',
  finding_summary TEXT,
  evidence_label TEXT NOT NULL DEFAULT 'Observed' CHECK (evidence_label IN ('Observed', 'Reported', 'Official', 'Estimated', 'Forecast', 'Proposed', 'Requires validation')),
  confidence_level TEXT NOT NULL DEFAULT 'Medium' CHECK (confidence_level IN ('Low', 'Medium', 'High', 'Requires validation')),
  follow_up_question TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.client_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_file_id UUID NOT NULL REFERENCES public.client_files(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  organization TEXT,
  stakeholder_group TEXT,
  role TEXT,
  interest_level TEXT,
  influence_level TEXT,
  decision_maker BOOLEAN NOT NULL DEFAULT false,
  needs TEXT,
  concerns TEXT,
  known_position TEXT,
  project_role TEXT,
  next_follow_up_at TIMESTAMPTZ,
  evidence_label TEXT NOT NULL DEFAULT 'Reported' CHECK (evidence_label IN ('Observed', 'Reported', 'Official', 'Estimated', 'Forecast', 'Proposed', 'Requires validation')),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.client_file_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_file_id UUID NOT NULL REFERENCES public.client_files(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_files_updated ON public.client_files(updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_files_owner ON public.client_files(owner_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_access_user ON public.client_file_access(user_id, client_file_id);
CREATE INDEX IF NOT EXISTS idx_client_observations_file ON public.client_observations(client_file_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_stakeholders_file ON public.client_stakeholders(client_file_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_timeline_file ON public.client_file_timeline_events(client_file_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.client_file_can_access(p_client_file_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator')
  ) OR EXISTS (
    SELECT 1 FROM public.client_files c
    WHERE c.id = p_client_file_id
      AND (c.owner_user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.client_file_access a
        WHERE a.client_file_id = c.id AND a.user_id = auth.uid()
      ))
  );
$$;

CREATE OR REPLACE FUNCTION public.client_file_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$;

ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_file_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_file_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_file_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authorized users access client files" ON public.client_files
  FOR SELECT TO authenticated USING (public.client_file_can_access(id));
CREATE POLICY "admins create client files" ON public.client_files
  FOR INSERT TO authenticated WITH CHECK (public.client_file_is_admin() AND owner_user_id = auth.uid());
CREATE POLICY "authorized users update client files" ON public.client_files
  FOR UPDATE TO authenticated USING (public.client_file_can_access(id)) WITH CHECK (public.client_file_can_access(id));
CREATE POLICY "admins archive client files" ON public.client_files
  FOR DELETE TO authenticated USING (public.client_file_is_admin());

CREATE POLICY "authorized users read client access" ON public.client_file_access
  FOR SELECT TO authenticated USING (public.client_file_can_access(client_file_id));
CREATE POLICY "admins manage client access" ON public.client_file_access
  FOR ALL TO authenticated USING (public.client_file_is_admin()) WITH CHECK (public.client_file_is_admin());

CREATE POLICY "authorized users access client intake" ON public.client_file_intakes
  FOR SELECT TO authenticated USING (public.client_file_can_access(client_file_id));
CREATE POLICY "authorized users edit client intake" ON public.client_file_intakes
  FOR ALL TO authenticated USING (public.client_file_can_access(client_file_id)) WITH CHECK (public.client_file_can_access(client_file_id));

CREATE POLICY "authorized users access client observations" ON public.client_observations
  FOR SELECT TO authenticated USING (public.client_file_can_access(client_file_id));
CREATE POLICY "authorized users edit client observations" ON public.client_observations
  FOR ALL TO authenticated USING (public.client_file_can_access(client_file_id)) WITH CHECK (public.client_file_can_access(client_file_id));

CREATE POLICY "authorized users access client stakeholders" ON public.client_stakeholders
  FOR SELECT TO authenticated USING (public.client_file_can_access(client_file_id));
CREATE POLICY "authorized users edit client stakeholders" ON public.client_stakeholders
  FOR ALL TO authenticated USING (public.client_file_can_access(client_file_id)) WITH CHECK (public.client_file_can_access(client_file_id));

CREATE POLICY "authorized users access client timeline" ON public.client_file_timeline_events
  FOR SELECT TO authenticated USING (public.client_file_can_access(client_file_id));
CREATE POLICY "authorized users add client timeline" ON public.client_file_timeline_events
  FOR INSERT TO authenticated WITH CHECK (public.client_file_can_access(client_file_id));

REVOKE ALL ON FUNCTION public.client_file_can_access(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.client_file_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_file_can_access(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.client_file_is_admin() TO authenticated, service_role;
