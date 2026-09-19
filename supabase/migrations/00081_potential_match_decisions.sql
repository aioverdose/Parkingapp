CREATE OR REPLACE FUNCTION public.accept_potential_match(p_match_id UUID, p_user_id UUID)
RETURNS public.potential_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  updated_match public.potential_matches;
  conversation public.potential_match_conversations;
BEGIN
  UPDATE public.potential_matches
  SET arriving_decision = CASE WHEN arriving_user_id = p_user_id THEN 'accepted' ELSE arriving_decision END,
      departing_decision = CASE WHEN departing_user_id = p_user_id THEN 'accepted' ELSE departing_decision END,
      arriving_decided_at = CASE WHEN arriving_user_id = p_user_id THEN COALESCE(arriving_decided_at, now()) ELSE arriving_decided_at END,
      departing_decided_at = CASE WHEN departing_user_id = p_user_id THEN COALESCE(departing_decided_at, now()) ELSE departing_decided_at END,
      status = CASE
        WHEN (CASE WHEN arriving_user_id = p_user_id THEN 'accepted' ELSE arriving_decision END) = 'accepted'
          AND (CASE WHEN departing_user_id = p_user_id THEN 'accepted' ELSE departing_decision END) = 'accepted'
          THEN 'mutually_accepted'
        WHEN arriving_user_id = p_user_id THEN 'accepted_by_arriving'
        ELSE 'accepted_by_departing'
      END,
      updated_at = now()
  WHERE id = p_match_id
    AND (arriving_user_id = p_user_id OR departing_user_id = p_user_id)
    AND status IN ('potential', 'accepted_by_arriving', 'accepted_by_departing')
  RETURNING * INTO updated_match;

  IF updated_match.id IS NULL THEN RAISE EXCEPTION 'Potential match is unavailable'; END IF;

  IF updated_match.status = 'mutually_accepted' AND updated_match.messenger_conversation_id IS NULL THEN
    INSERT INTO public.potential_match_conversations (potential_match_id, arriving_user_id, departing_user_id, expires_at)
    VALUES (updated_match.id, updated_match.arriving_user_id, updated_match.departing_user_id, LEAST(updated_match.expires_at, now() + interval '24 hours'))
    RETURNING * INTO conversation;
    UPDATE public.potential_matches SET messenger_conversation_id = conversation.id, updated_at = now() WHERE id = updated_match.id RETURNING * INTO updated_match;
  END IF;

  RETURN updated_match;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_potential_match(p_match_id UUID, p_user_id UUID)
RETURNS public.potential_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  declined_match public.potential_matches;
BEGIN
  UPDATE public.potential_matches
  SET arriving_decision = CASE WHEN arriving_user_id = p_user_id THEN 'declined' ELSE arriving_decision END,
      departing_decision = CASE WHEN departing_user_id = p_user_id THEN 'declined' ELSE departing_decision END,
      arriving_decided_at = CASE WHEN arriving_user_id = p_user_id THEN now() ELSE arriving_decided_at END,
      departing_decided_at = CASE WHEN departing_user_id = p_user_id THEN now() ELSE departing_decided_at END,
      status = 'declined', updated_at = now()
  WHERE id = p_match_id AND (arriving_user_id = p_user_id OR departing_user_id = p_user_id)
    AND status IN ('potential', 'accepted_by_arriving', 'accepted_by_departing')
  RETURNING * INTO declined_match;
  IF declined_match.id IS NULL THEN RAISE EXCEPTION 'Potential match is unavailable'; END IF;
  RETURN declined_match;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_potential_match(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decline_potential_match(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_potential_match(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.decline_potential_match(UUID, UUID) TO service_role;
