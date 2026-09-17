-- Lock down privileged RPCs exposed through PostgREST.
--
-- SECURITY DEFINER functions run with their owner's privileges. They must not
-- inherit the default EXECUTE grant to PUBLIC, anon, and authenticated.
-- Server-side code uses service_role for internal RPCs. The small allowlist
-- below preserves only RPCs that are intentionally called with a user JWT or
-- from RLS policies.

DO $$
DECLARE
  function_record RECORD;
BEGIN
  FOR function_record IN
    SELECT
      p.oid,
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS arguments
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
      function_record.schema_name,
      function_record.function_name,
      function_record.arguments
    );
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      function_record.schema_name,
      function_record.function_name,
      function_record.arguments
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      function_record.schema_name,
      function_record.function_name,
      function_record.arguments
    );
  END LOOP;
END
$$;

-- RPCs called by requests carrying the caller's JWT.
GRANT EXECUTE ON FUNCTION public.create_business(
  TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_business(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_messenger_conversation(UUID) TO authenticated;

-- Functions used inside authenticated RLS policies.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_business_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_network_member(UUID) TO authenticated;

-- Make the leaderboard obey the querying user's RLS policies instead of the
-- view owner's privileges.
ALTER VIEW public.spotquest_leaderboard SET (security_invoker = true);
