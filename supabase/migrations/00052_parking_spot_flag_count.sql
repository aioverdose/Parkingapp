-- Compatibility fix for production databases where the original security
-- layer migration did not add the spot flag counter.
ALTER TABLE public.parking_spots
  ADD COLUMN IF NOT EXISTS flag_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.parking_spots.flag_count IS
  'Number of moderation flags recorded for this parking spot';
