-- Add relay_mode to parking_spots: 'imminent' (5-15 min real-time) or 'scheduled' (hours/days ahead)

ALTER TABLE public.parking_spots
  ADD COLUMN IF NOT EXISTS relay_mode TEXT NOT NULL DEFAULT 'imminent'
  CHECK (relay_mode IN ('imminent', 'scheduled'));

COMMENT ON COLUMN public.parking_spots.relay_mode IS 'Relay type: imminent (5-15 min real-time alert) or scheduled (pre-committed departure hours/days ahead)';

CREATE INDEX IF NOT EXISTS idx_parking_spots_relay_mode ON public.parking_spots(relay_mode);
