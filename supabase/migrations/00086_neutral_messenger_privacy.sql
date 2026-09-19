-- Ordinary neutral Messenger content is participant-only. Admins do not get
-- implicit message access; reports and audit metadata are separate channels.
CREATE OR REPLACE FUNCTION public.potential_conversation_can_access(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.potential_match_conversations c
    WHERE c.id = p_conversation_id
      AND (c.arriving_user_id = auth.uid() OR c.departing_user_id = auth.uid())
  );
$$;
