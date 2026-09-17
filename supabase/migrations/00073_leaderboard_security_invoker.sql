-- Ensure the public leaderboard applies the caller's RLS policies.
ALTER VIEW public.spotquest_leaderboard SET (security_invoker = true);
