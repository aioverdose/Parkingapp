-- Neutral matching default: 300 feet, approximately 91 meters.
ALTER TABLE public.matching_schedule_windows
  ALTER COLUMN area_precision_meters SET DEFAULT 91;

UPDATE public.matching_schedule_windows
SET area_precision_meters = 91
WHERE area_precision_meters = 450;
