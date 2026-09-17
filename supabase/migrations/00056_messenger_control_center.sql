-- Messenger Control Center foundation.
-- This migration extends the existing ephemeral chat model; it does not replace it.

ALTER TABLE public.ephemeral_chats
  ADD COLUMN IF NOT EXISTS conversation_ended_at TIMESTAMPTZ;

ALTER TABLE public.ephemeral_messages
  ADD COLUMN IF NOT EXISTS message_kind TEXT NOT NULL DEFAULT 'ordinary',
  ADD COLUMN IF NOT EXISTS admin_reason TEXT,
  ADD COLUMN IF NOT EXISTS redacted_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ephemeral_messages_message_kind_check'
      AND conrelid = 'public.ephemeral_messages'::regclass
  ) THEN
    ALTER TABLE public.ephemeral_messages
      ADD CONSTRAINT ephemeral_messages_message_kind_check
      CHECK (message_kind IN ('ordinary', 'admin', 'system'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ephemeral_messages_admin_reason_check'
      AND conrelid = 'public.ephemeral_messages'::regclass
  ) THEN
    ALTER TABLE public.ephemeral_messages
      ADD CONSTRAINT ephemeral_messages_admin_reason_check
      CHECK (message_kind <> 'admin' OR NULLIF(BTRIM(admin_reason), '') IS NOT NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.messenger_conversation_settings (
  conversation_id UUID PRIMARY KEY REFERENCES public.ephemeral_chats(id) ON DELETE CASCADE,
  mutual_acceptance_at TIMESTAMPTZ,
  free_form_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  attachments_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ordinary_retention_days INTEGER NOT NULL DEFAULT 30 CHECK (ordinary_retention_days > 0),
  safety_evidence_retention_days INTEGER NOT NULL DEFAULT 730 CHECK (safety_evidence_retention_days > 0),
  dispute_hold_days INTEGER NOT NULL DEFAULT 180 CHECK (dispute_hold_days > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (NOT attachments_enabled),
  CHECK (NOT free_form_enabled OR mutual_acceptance_at IS NOT NULL)
);

-- Preserve the behavior of conversations that already existed before the
-- control center was introduced. New conversations remain opt-in until both
-- participants accept.
INSERT INTO public.messenger_conversation_settings
  (conversation_id, mutual_acceptance_at, free_form_enabled)
SELECT id, COALESCE(created_at, now()), TRUE
FROM public.ephemeral_chats
ON CONFLICT (conversation_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_messenger_conversation_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.messenger_conversation_settings (conversation_id)
  VALUES (NEW.id)
  ON CONFLICT (conversation_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ephemeral_chat_messenger_settings ON public.ephemeral_chats;
CREATE TRIGGER ephemeral_chat_messenger_settings
AFTER INSERT ON public.ephemeral_chats
FOR EACH ROW EXECUTE FUNCTION public.create_messenger_conversation_settings();

CREATE TABLE IF NOT EXISTS public.messenger_message_moderation (
  message_id UUID PRIMARY KEY REFERENCES public.ephemeral_messages(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unreviewed'
    CHECK (status IN ('unreviewed', 'allowed', 'flagged', 'removed', 'escalated')),
  labels TEXT[] NOT NULL DEFAULT '{}',
  moderator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  moderator_reason TEXT,
  is_safety_evidence BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messenger_exchange_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ephemeral_chats(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'request_sent', 'request_accepted', 'request_declined', 'conversation_started',
    'conversation_ended', 'message_reported', 'dispute_opened', 'dispute_resolved'
  )),
  event_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messenger_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ephemeral_chats(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.ephemeral_messages(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('harassment', 'spam', 'threat', 'fraud', 'privacy', 'other')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution TEXT,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messenger_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ephemeral_chats(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  resolution TEXT,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  hold_until TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '180 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messenger_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  message TEXT NOT NULL,
  admin_reason TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messenger_retention_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ephemeral_chats(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.ephemeral_messages(id) ON DELETE CASCADE,
  hold_type TEXT NOT NULL CHECK (hold_type IN ('safety_evidence', 'dispute', 'legal', 'manual')),
  reason TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.messenger_admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ephemeral_chats(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.ephemeral_messages(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messenger_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  conversation_id UUID REFERENCES public.ephemeral_chats(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.ephemeral_messages(id) ON DELETE SET NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messenger_events_conversation ON public.messenger_exchange_events(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messenger_reports_conversation ON public.messenger_reports(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messenger_disputes_conversation ON public.messenger_disputes(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messenger_holds_message ON public.messenger_retention_holds(message_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_messenger_audit_conversation ON public.messenger_audit_logs(conversation_id, created_at);

ALTER TABLE public.messenger_conversation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_message_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_exchange_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_retention_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Messenger participants can read messages" ON public.ephemeral_messages;
DROP POLICY IF EXISTS "Messenger participants can insert accepted messages" ON public.ephemeral_messages;
DROP POLICY IF EXISTS "Messenger admins can insert labeled messages" ON public.ephemeral_messages;
DROP POLICY IF EXISTS "Participants can read messenger settings" ON public.messenger_conversation_settings;
DROP POLICY IF EXISTS "Participants can create messenger settings" ON public.messenger_conversation_settings;
DROP POLICY IF EXISTS "Participants can update messenger settings" ON public.messenger_conversation_settings;
DROP POLICY IF EXISTS "Admins can read moderation metadata" ON public.messenger_message_moderation;
DROP POLICY IF EXISTS "Admins can manage moderation metadata" ON public.messenger_message_moderation;
DROP POLICY IF EXISTS "Participants can read exchange events" ON public.messenger_exchange_events;
DROP POLICY IF EXISTS "Participants can add exchange events" ON public.messenger_exchange_events;
DROP POLICY IF EXISTS "Users can read own messenger reports" ON public.messenger_reports;
DROP POLICY IF EXISTS "Participants can create messenger reports" ON public.messenger_reports;
DROP POLICY IF EXISTS "Admins can manage messenger reports" ON public.messenger_reports;
DROP POLICY IF EXISTS "Users can read own messenger disputes" ON public.messenger_disputes;
DROP POLICY IF EXISTS "Participants can open messenger disputes" ON public.messenger_disputes;
DROP POLICY IF EXISTS "Admins can manage messenger disputes" ON public.messenger_disputes;
DROP POLICY IF EXISTS "Admins can manage messenger templates" ON public.messenger_message_templates;
DROP POLICY IF EXISTS "Admins can manage retention holds" ON public.messenger_retention_holds;
DROP POLICY IF EXISTS "Admins can manage admin notes" ON public.messenger_admin_notes;
DROP POLICY IF EXISTS "Admins can read messenger audit logs" ON public.messenger_audit_logs;

-- Rebuild message policies so ordinary free-form messages require mutual acceptance.
-- Conversation creation is server-controlled after participant validation.
DROP POLICY IF EXISTS "Participants can insert chat" ON public.ephemeral_chats;
DROP POLICY IF EXISTS "Chat participants can insert messages" ON public.ephemeral_messages;
DROP POLICY IF EXISTS "Chat participants can read messages" ON public.ephemeral_messages;
CREATE POLICY "Messenger participants can read messages" ON public.ephemeral_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.ephemeral_chats c WHERE c.id = chat_id
    AND (auth.uid() = c.sender_id OR auth.uid() = c.receiver_id)) OR public.is_admin());
CREATE POLICY "Messenger participants can insert accepted messages" ON public.ephemeral_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND message_kind = 'ordinary' AND
    EXISTS (SELECT 1 FROM public.ephemeral_chats c
      JOIN public.messenger_conversation_settings s ON s.conversation_id = c.id
      WHERE c.id = chat_id AND (auth.uid() = c.sender_id OR auth.uid() = c.receiver_id)
        AND s.mutual_acceptance_at IS NOT NULL AND s.free_form_enabled)
  );
CREATE POLICY "Messenger admins can insert labeled messages" ON public.ephemeral_messages FOR INSERT
  WITH CHECK (public.is_admin() AND message_kind IN ('admin', 'system')
    AND (message_kind <> 'admin' OR NULLIF(BTRIM(admin_reason), '') IS NOT NULL));

DROP POLICY IF EXISTS "Participants can read messenger settings" ON public.messenger_conversation_settings;
CREATE POLICY "Participants can read messenger settings" ON public.messenger_conversation_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.ephemeral_chats c WHERE c.id = conversation_id
    AND (auth.uid() = c.sender_id OR auth.uid() = c.receiver_id)) OR public.is_admin());
CREATE OR REPLACE FUNCTION public.accept_messenger_conversation(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  accepted INTEGER;
BEGIN
  UPDATE public.messenger_conversation_settings s
  SET mutual_acceptance_at = COALESCE(s.mutual_acceptance_at, now()),
      free_form_enabled = TRUE,
      updated_at = now()
  FROM public.ephemeral_chats c
  WHERE s.conversation_id = p_conversation_id
    AND c.id = p_conversation_id
    AND c.receiver_id = auth.uid()
    AND c.status = 'active'
    AND c.expires_at > now();
  GET DIAGNOSTICS accepted = ROW_COUNT;
  IF accepted > 0 THEN
    INSERT INTO public.messenger_exchange_events (conversation_id, actor_id, event_type)
    VALUES (p_conversation_id, auth.uid(), 'request_accepted');
  END IF;
  RETURN accepted > 0;
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_messenger_conversation(UUID) TO authenticated;

-- Settings are created by the conversation trigger and changed only by the
-- acceptance RPC or authorized server-side administration. Participants can
-- read them but cannot forge acceptance or retention settings.
DROP POLICY IF EXISTS "Participants can create messenger settings" ON public.messenger_conversation_settings;
DROP POLICY IF EXISTS "Participants can update messenger settings" ON public.messenger_conversation_settings;

CREATE POLICY "Admins can read moderation metadata" ON public.messenger_message_moderation FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage moderation metadata" ON public.messenger_message_moderation FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Participants can read exchange events" ON public.messenger_exchange_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.ephemeral_chats c WHERE c.id = conversation_id
    AND (auth.uid() = c.sender_id OR auth.uid() = c.receiver_id)) OR public.is_admin());
CREATE POLICY "Participants can add exchange events" ON public.messenger_exchange_events FOR INSERT
  WITH CHECK (auth.uid() = actor_id AND EXISTS (SELECT 1 FROM public.ephemeral_chats c WHERE c.id = conversation_id
    AND (auth.uid() = c.sender_id OR auth.uid() = c.receiver_id)));

CREATE POLICY "Users can read own messenger reports" ON public.messenger_reports FOR SELECT
  USING (reporter_id = auth.uid() OR public.is_admin());
CREATE POLICY "Participants can create messenger reports" ON public.messenger_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid() AND EXISTS (SELECT 1 FROM public.ephemeral_chats c WHERE c.id = conversation_id
    AND (auth.uid() = c.sender_id OR auth.uid() = c.receiver_id)));
CREATE POLICY "Admins can manage messenger reports" ON public.messenger_reports FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Users can read own messenger disputes" ON public.messenger_disputes FOR SELECT
  USING (opened_by = auth.uid() OR public.is_admin());
CREATE POLICY "Participants can open messenger disputes" ON public.messenger_disputes FOR INSERT
  WITH CHECK (opened_by = auth.uid() AND EXISTS (SELECT 1 FROM public.ephemeral_chats c WHERE c.id = conversation_id
    AND (auth.uid() = c.sender_id OR auth.uid() = c.receiver_id)));
CREATE POLICY "Admins can manage messenger disputes" ON public.messenger_disputes FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage messenger templates" ON public.messenger_message_templates FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can manage retention holds" ON public.messenger_retention_holds FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can manage admin notes" ON public.messenger_admin_notes FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can read messenger audit logs" ON public.messenger_audit_logs FOR SELECT
  USING (public.is_admin());

-- No client role receives INSERT/UPDATE/DELETE policies for append-only event/audit tables.
CREATE OR REPLACE FUNCTION public.cleanup_messenger_messages()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ephemeral_messages m
  USING public.ephemeral_chats c
  WHERE c.id = m.chat_id
    AND m.message_kind = 'ordinary'
    AND COALESCE(c.conversation_ended_at, c.closed_at) IS NOT NULL
    AND COALESCE(c.conversation_ended_at, c.closed_at) <= now() -
      make_interval(days => COALESCE((
        SELECT s.ordinary_retention_days
        FROM public.messenger_conversation_settings s
        WHERE s.conversation_id = c.id
      ), 30))
    AND NOT EXISTS (
      SELECT 1 FROM public.messenger_message_moderation mm
      WHERE mm.message_id = m.id AND mm.is_safety_evidence
        AND (mm.resolved_at IS NULL OR mm.resolved_at + INTERVAL '730 days' > now())
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.messenger_retention_holds h
      WHERE (h.message_id = m.id OR (h.message_id IS NULL AND h.conversation_id = c.id))
        AND h.starts_at <= now() AND (h.ends_at IS NULL OR h.ends_at > now())
    );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_messenger_messages() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_messenger_messages() TO service_role;

COMMENT ON TABLE public.messenger_conversation_settings IS 'Messenger defaults: 30-day ordinary retention, 730-day safety evidence, 180-day dispute holds, and no attachments.';
COMMENT ON FUNCTION public.cleanup_messenger_messages() IS 'Deletes ordinary messages after 30 days from conversation end while preserving safety evidence and active holds.';
