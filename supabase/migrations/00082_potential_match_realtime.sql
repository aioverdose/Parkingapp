DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'potential_matches') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.potential_matches;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'potential_match_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.potential_match_messages;
  END IF;
END
$$;
