-- Handoff alignment: makes the arriving driver reach the spot right as the
-- departing owner pulls out.
--
-- On the owner's session we store their "depart ETA" (time to reach the car +
-- pull out, computed from their live GPS while walking back) plus one-shot
-- flags for the get-ready / pull-out-now pushes so each fires exactly once.
-- On the seeker's session we store a one-shot flag for the "you're early, wait"
-- hold push so the driver does not circle the block while the owner is away.

ALTER TABLE public.active_sessions
  ADD COLUMN IF NOT EXISTS owner_depart_eta_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS align_get_ready_fired BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS align_go_fired BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS align_hold_fired BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_active_sessions_align
  ON public.active_sessions(match_id, role);
