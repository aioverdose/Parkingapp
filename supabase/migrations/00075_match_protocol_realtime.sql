-- Enable live delivery for the match protocol. RLS still controls which rows
-- each authenticated participant can receive.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ephemeral_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ephemeral_messages;
  END IF;
END
$$;

-- A confirmed match creates a chat for both participants. Either participant
-- may accept that conversation; the RLS policy still requires membership in the
-- chat before messages can be read or sent.
CREATE OR REPLACE FUNCTION public.accept_messenger_conversation(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
    AND (c.sender_id = auth.uid() OR c.receiver_id = auth.uid())
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
