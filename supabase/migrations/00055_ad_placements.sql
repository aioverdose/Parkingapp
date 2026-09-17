-- Control which product surface can render each campaign.
ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS placement TEXT NOT NULL DEFAULT 'all';

UPDATE public.ads
SET placement = 'all'
WHERE placement IS NULL;

ALTER TABLE public.ads
  DROP CONSTRAINT IF EXISTS ads_placement_check;

ALTER TABLE public.ads
  ADD CONSTRAINT ads_placement_check
  CHECK (placement IN ('all', 'spot_details', 'sidebar', 'dashboard'));
