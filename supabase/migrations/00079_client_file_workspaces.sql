-- Structured Client Files workspaces: TIME, PARK, privacy, opportunities,
-- pilots, meetings, tasks, and research resources.

CREATE TABLE IF NOT EXISTS public.client_file_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_file_id UUID NOT NULL REFERENCES public.client_files(id) ON DELETE CASCADE,
  framework TEXT NOT NULL CHECK (framework IN ('TIME', 'PARK', 'privacy')),
  section_key TEXT NOT NULL,
  plain_language_assessment TEXT NOT NULL DEFAULT '',
  evidence_collected TEXT NOT NULL DEFAULT '',
  observations TEXT NOT NULL DEFAULT '',
  stakeholder_input TEXT NOT NULL DEFAULT '',
  known_risks TEXT NOT NULL DEFAULT '',
  opportunity_score INTEGER CHECK (opportunity_score IS NULL OR opportunity_score BETWEEN 0 AND 100),
  confidence_level TEXT NOT NULL DEFAULT 'Requires validation' CHECK (confidence_level IN ('Low', 'Medium', 'High', 'Requires validation')),
  recommended_action TEXT NOT NULL DEFAULT '',
  open_questions TEXT NOT NULL DEFAULT '',
  data_sensitivity TEXT,
  data_needed TEXT,
  data_not_needed TEXT,
  retention_proposal TEXT,
  accessibility_implications TEXT,
  fairness_implications TEXT,
  mitigation_notes TEXT,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_file_id, framework, section_key)
);

CREATE TABLE IF NOT EXISTS public.client_file_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_file_id UUID NOT NULL REFERENCES public.client_files(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  opportunity_type TEXT NOT NULL DEFAULT 'Other',
  problem_addressed TEXT NOT NULL DEFAULT '',
  evidence_supporting TEXT NOT NULL DEFAULT '',
  affected_stakeholders TEXT NOT NULL DEFAULT '',
  client_value TEXT NOT NULL DEFAULT '',
  user_value TEXT NOT NULL DEFAULT '',
  privacy_considerations TEXT NOT NULL DEFAULT '',
  accessibility_considerations TEXT NOT NULL DEFAULT '',
  estimated_effort TEXT,
  estimated_timeline TEXT,
  risk_level TEXT NOT NULL DEFAULT 'Medium',
  confidence_level TEXT NOT NULL DEFAULT 'Requires validation',
  status TEXT NOT NULL DEFAULT 'Idea' CHECK (status IN ('Idea', 'Researching', 'Recommended', 'Client discussion', 'Proposal candidate', 'Approved', 'Not proceeding')),
  recommended_next_step TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.client_file_pilots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_file_id UUID NOT NULL REFERENCES public.client_files(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  status TEXT NOT NULL DEFAULT 'Concept' CHECK (status IN ('Concept', 'Proposed', 'Under review', 'Approved', 'Active', 'Paused', 'Completed', 'Cancelled')),
  problem TEXT NOT NULL DEFAULT '',
  hypothesis TEXT NOT NULL DEFAULT '',
  target_users TEXT NOT NULL DEFAULT '',
  pilot_geography TEXT NOT NULL DEFAULT '',
  duration_text TEXT NOT NULL DEFAULT '',
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  time_zone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  features_included TEXT NOT NULL DEFAULT '',
  features_excluded TEXT NOT NULL DEFAULT '',
  operating_owner TEXT NOT NULL DEFAULT '',
  participant_communications TEXT NOT NULL DEFAULT '',
  data_collected TEXT NOT NULL DEFAULT '',
  data_not_collected TEXT NOT NULL DEFAULT '',
  accessibility_plan TEXT NOT NULL DEFAULT '',
  safety_plan TEXT NOT NULL DEFAULT '',
  baseline_conditions TEXT NOT NULL DEFAULT '',
  success_metrics TEXT NOT NULL DEFAULT '',
  decision_criteria TEXT NOT NULL DEFAULT '',
  stop_criteria TEXT NOT NULL DEFAULT '',
  risks TEXT NOT NULL DEFAULT '',
  assumptions TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_file_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_file_id UUID NOT NULL REFERENCES public.client_files(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  meeting_type TEXT NOT NULL DEFAULT 'Discovery meeting',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  time_zone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  participants TEXT NOT NULL DEFAULT '',
  agenda TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  decisions TEXT NOT NULL DEFAULT '',
  follow_up TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_file_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_file_id UUID NOT NULL REFERENCES public.client_files(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Inbox' CHECK (status IN ('Inbox', 'Next', 'In progress', 'Waiting', 'Blocked', 'Completed', 'Archived')),
  priority TEXT NOT NULL DEFAULT 'Medium',
  due_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.client_file_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_file_id UUID NOT NULL REFERENCES public.client_files(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 240),
  resource_type TEXT NOT NULL DEFAULT 'Other',
  source_organization TEXT,
  source_url TEXT,
  publication_date DATE,
  summary TEXT NOT NULL DEFAULT '',
  key_takeaways TEXT NOT NULL DEFAULT '',
  reliability_level TEXT NOT NULL DEFAULT 'Requires validation',
  relevant_framework TEXT,
  date_accessed DATE NOT NULL DEFAULT current_date,
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_client_assessments_file ON public.client_file_assessments(client_file_id, framework);
CREATE INDEX IF NOT EXISTS idx_client_opportunities_file ON public.client_file_opportunities(client_file_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_pilots_file ON public.client_file_pilots(client_file_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_meetings_file ON public.client_file_meetings(client_file_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_tasks_file ON public.client_file_tasks(client_file_id, due_at);
CREATE INDEX IF NOT EXISTS idx_client_resources_file ON public.client_file_resources(client_file_id, updated_at DESC);

ALTER TABLE public.client_file_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_file_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_file_pilots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_file_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_file_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_file_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authorized users access client assessments" ON public.client_file_assessments FOR ALL TO authenticated USING (public.client_file_can_access(client_file_id)) WITH CHECK (public.client_file_can_access(client_file_id));
CREATE POLICY "authorized users access client opportunities" ON public.client_file_opportunities FOR ALL TO authenticated USING (public.client_file_can_access(client_file_id)) WITH CHECK (public.client_file_can_access(client_file_id));
CREATE POLICY "authorized users access client pilots" ON public.client_file_pilots FOR ALL TO authenticated USING (public.client_file_can_access(client_file_id)) WITH CHECK (public.client_file_can_access(client_file_id));
CREATE POLICY "authorized users access client meetings" ON public.client_file_meetings FOR ALL TO authenticated USING (public.client_file_can_access(client_file_id)) WITH CHECK (public.client_file_can_access(client_file_id));
CREATE POLICY "authorized users access client tasks" ON public.client_file_tasks FOR ALL TO authenticated USING (public.client_file_can_access(client_file_id)) WITH CHECK (public.client_file_can_access(client_file_id));
CREATE POLICY "authorized users access client resources" ON public.client_file_resources FOR ALL TO authenticated USING (public.client_file_can_access(client_file_id)) WITH CHECK (public.client_file_can_access(client_file_id));
