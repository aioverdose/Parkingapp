-- Add vehicle_type to user_game_profile for Belmont Shore mini-game

ALTER TABLE public.user_game_profile
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT;

COMMENT ON COLUMN public.user_game_profile.vehicle_type IS 'Player vehicle type for SpotQuest mini-game (sedan, suv, truck, compact, motorcycle, van)';
