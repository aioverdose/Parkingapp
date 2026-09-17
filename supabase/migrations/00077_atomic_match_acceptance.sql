-- Preserve both users' acceptance when they accept concurrently.
CREATE OR REPLACE FUNCTION public.accept_match_atomically(
  p_match_id UUID,
  p_user_id UUID
)
RETURNS public.spot_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  accepted_match public.spot_matches;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User is required';
  END IF;

  UPDATE public.spot_matches
  SET status = CASE
        WHEN status = 'pending' AND spot_owner_id = p_user_id THEN 'confirmed_by_owner'
        WHEN status = 'pending' AND seeker_id = p_user_id THEN 'confirmed_by_seeker'
        WHEN status = 'confirmed_by_seeker' AND spot_owner_id = p_user_id THEN 'confirmed'
        WHEN status = 'confirmed_by_owner' AND seeker_id = p_user_id THEN 'confirmed'
        ELSE status
      END,
      updated_at = now()
  WHERE id = p_match_id
    AND (spot_owner_id = p_user_id OR seeker_id = p_user_id)
    AND status IN ('pending', 'confirmed_by_owner', 'confirmed_by_seeker', 'confirmed')
  RETURNING * INTO accepted_match;

  IF accepted_match.id IS NULL THEN
    RAISE EXCEPTION 'Match cannot be accepted in its current state';
  END IF;

  RETURN accepted_match;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_match_atomically(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_match_atomically(UUID, UUID) TO service_role;
