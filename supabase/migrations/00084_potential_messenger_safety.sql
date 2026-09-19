-- Neutral Messenger safety, retention, actions, and expiration.

ALTER TABLE public.potential_match_conversations
  ADD COLUMN IF NOT EXISTS ordinary_retention_days INTEGER NOT NULL DEFAULT 30 CHECK (ordinary_retention_days > 0),
  ADD COLUMN IF NOT EXISTS safety_hold_until TIMESTAMPTZ;

ALTER TABLE public.potential_match_messages
  ADD COLUMN IF NOT EXISTS message_kind TEXT NOT NULL DEFAULT 'text' CHECK (message_kind IN ('text', 'action')),
  ADD COLUMN IF NOT EXISTS action_type TEXT,
  ADD COLUMN IF NOT EXISTS action_data JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.potential_match_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  potential_match_id UUID NOT NULL REFERENCES public.potential_matches(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.potential_match_conversations(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('harassment', 'spam', 'threat', 'fraud', 'privacy', 'other')),
  reason TEXT NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 2000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS potential_match_reports_match_idx ON public.potential_match_reports(potential_match_id, created_at DESC);
CREATE INDEX IF NOT EXISTS potential_match_reports_status_idx ON public.potential_match_reports(status, created_at DESC);

ALTER TABLE public.potential_match_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "participants create potential reports" ON public.potential_match_reports;
DROP POLICY IF EXISTS "users read own potential reports" ON public.potential_match_reports;
CREATE POLICY "participants create potential reports" ON public.potential_match_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND public.potential_match_can_access(potential_match_id));
CREATE POLICY "users read own potential reports" ON public.potential_match_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "participants read messages" ON public.potential_match_messages;
DROP POLICY IF EXISTS "participants send messages" ON public.potential_match_messages;
CREATE POLICY "active participants read messages" ON public.potential_match_messages FOR SELECT TO authenticated
  USING (public.potential_conversation_can_access(conversation_id) AND EXISTS (
    SELECT 1 FROM public.potential_match_conversations c
    WHERE c.id = conversation_id AND c.status = 'active' AND c.expires_at > now()
  ));
CREATE POLICY "active participants send messages" ON public.potential_match_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND message_kind IN ('text', 'action')
    AND public.potential_conversation_can_access(conversation_id)
    AND EXISTS (
      SELECT 1 FROM public.potential_match_conversations c
      WHERE c.id = conversation_id AND c.status = 'active' AND c.expires_at > now()
    )
  );

CREATE OR REPLACE FUNCTION public.expire_potential_matches()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE changed_count INTEGER;
BEGIN
  UPDATE public.potential_matches
  SET status = 'expired', updated_at = now()
  WHERE status IN ('potential', 'accepted_by_arriving', 'accepted_by_departing')
    AND expires_at <= now();
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  UPDATE public.potential_match_conversations c
  SET status = 'expired', closed_at = COALESCE(closed_at, now())
  WHERE status = 'active' AND expires_at <= now();
  RETURN changed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_potential_matches() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_potential_matches() TO service_role;
