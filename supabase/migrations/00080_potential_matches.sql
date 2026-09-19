-- Neutral potential matching foundation. Legacy spot-based tables are retained.

CREATE TABLE IF NOT EXISTS public.matching_schedule_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('arriving', 'departing')),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  window_start TIME NOT NULL,
  window_end TIME NOT NULL,
  time_zone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  area_latitude DOUBLE PRECISION NOT NULL CHECK (area_latitude BETWEEN -90 AND 90),
  area_longitude DOUBLE PRECISION NOT NULL CHECK (area_longitude BETWEEN -180 AND 180),
  area_precision_meters INTEGER NOT NULL DEFAULT 450 CHECK (area_precision_meters BETWEEN 50 AND 5000),
  vehicle_type TEXT,
  matching_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type TEXT NOT NULL DEFAULT 'profile' CHECK (source_type IN ('profile', 'recurring_schedule', 'date_entry')),
  source_id UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (window_start <> window_end)
);

CREATE TABLE IF NOT EXISTS public.potential_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arriving_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  departing_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  arriving_window_id UUID NOT NULL REFERENCES public.matching_schedule_windows(id) ON DELETE CASCADE,
  departing_window_id UUID NOT NULL REFERENCES public.matching_schedule_windows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'potential' CHECK (status IN ('potential', 'accepted_by_arriving', 'accepted_by_departing', 'mutually_accepted', 'declined', 'expired', 'cancelled')),
  arriving_decision TEXT NOT NULL DEFAULT 'pending' CHECK (arriving_decision IN ('pending', 'accepted', 'declined')),
  departing_decision TEXT NOT NULL DEFAULT 'pending' CHECK (departing_decision IN ('pending', 'accepted', 'declined')),
  arriving_decided_at TIMESTAMPTZ,
  departing_decided_at TIMESTAMPTZ,
  distance_meters INTEGER NOT NULL CHECK (distance_meters >= 0),
  match_radius_snapshot_meters INTEGER NOT NULL CHECK (match_radius_snapshot_meters > 0),
  time_overlap_minutes INTEGER NOT NULL CHECK (time_overlap_minutes >= 0),
  minimum_overlap_snapshot_minutes INTEGER NOT NULL CHECK (minimum_overlap_snapshot_minutes >= 0),
  arriving_vehicle_type TEXT,
  departing_vehicle_type TEXT,
  vehicle_compatible BOOLEAN NOT NULL,
  privacy_eligible BOOLEAN NOT NULL,
  eligibility_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  match_confidence NUMERIC(5,2) CHECK (match_confidence IS NULL OR match_confidence BETWEEN 0 AND 100),
  expires_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  messenger_conversation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (arriving_user_id <> departing_user_id)
);

CREATE TABLE IF NOT EXISTS public.potential_match_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  potential_match_id UUID NOT NULL UNIQUE REFERENCES public.potential_matches(id) ON DELETE CASCADE,
  arriving_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  departing_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  CHECK (arriving_user_id <> departing_user_id)
);

ALTER TABLE public.potential_matches
  ADD CONSTRAINT potential_matches_conversation_fk
  FOREIGN KEY (messenger_conversation_id)
  REFERENCES public.potential_match_conversations(id)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.potential_match_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.potential_match_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS potential_match_id UUID REFERENCES public.potential_matches(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS potential_matches_pair_window_uidx
  ON public.potential_matches (
    LEAST(arriving_user_id, departing_user_id),
    GREATEST(arriving_user_id, departing_user_id),
    arriving_window_id,
    departing_window_id
  )
  WHERE status IN ('potential', 'accepted_by_arriving', 'accepted_by_departing', 'mutually_accepted');

CREATE INDEX IF NOT EXISTS matching_windows_active_idx ON public.matching_schedule_windows(user_id, active, matching_enabled);
CREATE INDEX IF NOT EXISTS potential_matches_arriving_active_idx ON public.potential_matches(arriving_user_id, status, expires_at);
CREATE INDEX IF NOT EXISTS potential_matches_departing_active_idx ON public.potential_matches(departing_user_id, status, expires_at);
CREATE INDEX IF NOT EXISTS potential_matches_expiry_idx ON public.potential_matches(expires_at) WHERE status IN ('potential', 'accepted_by_arriving', 'accepted_by_departing');
CREATE INDEX IF NOT EXISTS potential_match_messages_conversation_idx ON public.potential_match_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS notifications_potential_match_idx ON public.notifications(potential_match_id);

CREATE OR REPLACE FUNCTION public.potential_match_can_access(p_match_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.potential_matches m
    WHERE m.id = p_match_id AND (m.arriving_user_id = auth.uid() OR m.departing_user_id = auth.uid())
  ) OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'));
$$;

CREATE OR REPLACE FUNCTION public.potential_conversation_can_access(p_conversation_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.potential_match_conversations c
    WHERE c.id = p_conversation_id AND (c.arriving_user_id = auth.uid() OR c.departing_user_id = auth.uid())
  ) OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'));
$$;

ALTER TABLE public.matching_schedule_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.potential_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.potential_match_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.potential_match_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own matching windows" ON public.matching_schedule_windows
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "participants read potential matches" ON public.potential_matches
  FOR SELECT TO authenticated USING (public.potential_match_can_access(id));
CREATE POLICY "participants read conversations" ON public.potential_match_conversations
  FOR SELECT TO authenticated USING (public.potential_conversation_can_access(id));
CREATE POLICY "participants read messages" ON public.potential_match_messages
  FOR SELECT TO authenticated USING (public.potential_conversation_can_access(conversation_id));
CREATE POLICY "participants send messages" ON public.potential_match_messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.potential_conversation_can_access(conversation_id));

REVOKE ALL ON FUNCTION public.potential_match_can_access(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.potential_conversation_can_access(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.potential_match_can_access(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.potential_conversation_can_access(UUID) TO authenticated, service_role;

INSERT INTO public.feature_flags (name, enabled, rollout, description)
VALUES ('neutral_matching_v1', false, '{"mode":"allowlist","user_ids":[],"roles":["admin"]}'::jsonb, 'Neutral potential matching; disabled until migration QA is complete.')
ON CONFLICT (name) DO NOTHING;
