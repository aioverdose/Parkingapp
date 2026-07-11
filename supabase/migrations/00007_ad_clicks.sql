-- Add clicks column to ads table for tracking ad click-through rate
ALTER TABLE public.ads
ADD COLUMN IF NOT EXISTS clicks INT NOT NULL DEFAULT 0;
