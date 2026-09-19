CREATE TABLE IF NOT EXISTS public.potential_match_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  potential_match_id UUID REFERENCES public.potential_matches(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.potential_match_conversations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS potential_match_audit_match_idx ON public.potential_match_audit_events(potential_match_id, created_at DESC);
ALTER TABLE public.potential_match_audit_events ENABLE ROW LEVEL SECURITY;
