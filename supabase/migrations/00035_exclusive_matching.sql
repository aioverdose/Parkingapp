-- Exclusive single-driver matching: only one best-compatible seeker is ever
-- made aware of a given parking spot. Offers have an acceptance window and
-- automatically reassign to the next-best seeker on decline/timeout.
--
-- Changes:
--  1. spot_matches: add 'offered' / 'offer_declined' / 'offer_expired' statuses
--     plus offer timestamps (acceptance window).
--  2. parking_spots: visibility ('exclusive' | 'public') + attempt counters so
--     a spot is hidden from the public map until it is actually offered, and can
--     fall back to a public claimable alert only after configured attempts.
--  3. users: decline / no-show counters that feed the best-seeker scoring.

-- ---------------------------------------------------------------------------
-- 1. spot_matches: offered lifecycle + acceptance window
-- ---------------------------------------------------------------------------
ALTER TABLE public.spot_matches
  DROP CONSTRAINT IF EXISTS spot_matches_status_check;

ALTER TABLE public.spot_matches
  ADD COLUMN IF NOT EXISTS offer_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMPTZ;

ALTER TABLE public.spot_matches
  ADD CONSTRAINT spot_matches_status_check
  CHECK (status IN (
    'pending',
    'offered',
    'confirmed_by_owner',
    'confirmed_by_seeker',
    'confirmed',
    'rejected',
    'offer_declined',
    'offer_expired',
    'expired'
  ));

COMMENT ON COLUMN public.spot_matches.offer_sent_at IS 'When the exclusive offer was sent to the seeker';
COMMENT ON COLUMN public.spot_matches.offer_expires_at IS 'Deadline for the seeker to accept the exclusive offer';

CREATE INDEX IF NOT EXISTS idx_spot_matches_offered_expiry
  ON public.spot_matches (offer_expires_at)
  WHERE status = 'offered';

-- Notify ONLY the offered seeker when an exclusive offer is created.
-- All other statuses keep the original dual-party behavior.
CREATE OR REPLACE FUNCTION public.notify_match_created()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'offered' THEN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (NEW.seeker_id, 'Exclusive spot offer!', 'A spot just opened up near you. You have a short window to accept it before it goes to someone else.', 'match');
  ELSE
    INSERT INTO notifications (user_id, title, message, type)
    VALUES
      (NEW.seeker_id, 'Match found!', 'A spot matching your needs is available. Confirm to claim it.', 'match'),
      (NEW.spot_owner_id, 'Match found!', 'Someone wants your spot. Confirm the match to proceed.', 'match');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 2. parking_spots: exclusive visibility + attempt counters
-- ---------------------------------------------------------------------------
ALTER TABLE public.parking_spots
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'exclusive'
  CHECK (visibility IN ('exclusive', 'public'));

ALTER TABLE public.parking_spots
  ADD COLUMN IF NOT EXISTS exclusive_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.parking_spots
  ADD COLUMN IF NOT EXISTS max_exclusive_attempts INTEGER NOT NULL DEFAULT 5;

COMMENT ON COLUMN public.parking_spots.visibility IS 'exclusive: only offered seekers know about it; public: claimable by anyone on the map (fallback after exclusive attempts exhausted)';
COMMENT ON COLUMN public.parking_spots.exclusive_attempts IS 'Number of exclusive offers made for this spot';
COMMENT ON COLUMN public.parking_spots.max_exclusive_attempts IS 'Exclusive attempts before the spot falls back to a public claimable alert';

CREATE INDEX IF NOT EXISTS idx_parking_spots_visibility ON public.parking_spots (visibility)
  WHERE status = 'active';

-- Exclusive spots must not be readable (or realtime-subscribable) by anyone but
-- their owner until they fall back to a public claimable alert.
DROP POLICY IF EXISTS "Anyone can read active spots" ON public.parking_spots;
CREATE POLICY "Anyone can read active spots"
  ON public.parking_spots FOR SELECT
  USING (status = 'active' AND (visibility = 'public' OR auth.uid() = user_id));

-- ---------------------------------------------------------------------------
-- 3. users: seeker reliability counters used in best-seeker scoring
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS decline_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS no_show_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.users.decline_count IS 'Number of exclusive offers the user has declined';
COMMENT ON COLUMN public.users.no_show_count IS 'Number of confirmed matches where the user failed to show up';
