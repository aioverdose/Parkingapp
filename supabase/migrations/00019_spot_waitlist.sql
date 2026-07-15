-- Spot Waitlist: users can queue for spots in their area

CREATE TABLE IF NOT EXISTS spot_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 200,
  vehicle_type TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE spot_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own waitlist entries"
  ON spot_waitlist
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_spot_waitlist_user_id ON spot_waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_spot_waitlist_active ON spot_waitlist(active);
CREATE INDEX IF NOT EXISTS idx_spot_waitlist_location ON spot_waitlist(latitude, longitude);

-- Function to notify waitlisted users when a new spot is created
CREATE OR REPLACE FUNCTION notify_waitlist_on_new_spot()
RETURNS TRIGGER AS $$
DECLARE
  waitlist_entry RECORD;
BEGIN
  FOR waitlist_entry IN
    SELECT w.user_id, w.latitude, w.longitude, w.radius_meters
    FROM spot_waitlist w
    WHERE w.active = true
      AND (
        w.vehicle_type IS NULL OR
        w.vehicle_type = NEW.vehicle_type
      )
      AND (
        6371 * acos(
          cos(radians(w.latitude)) * cos(radians(NEW.latitude)) *
          cos(radians(NEW.longitude) - radians(w.longitude)) +
          sin(radians(w.latitude)) * sin(radians(NEW.latitude))
        ) * 1000 <= w.radius_meters
      )
  LOOP
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      waitlist_entry.user_id,
      'spot_available',
      'Spot Available in Your Area!',
      'A parking spot matching your waitlist has been listed nearby.',
      jsonb_build_object(
        'spot_id', NEW.id,
        'latitude', NEW.latitude,
        'longitude', NEW.longitude
      )
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_waitlist ON parking_spots;
CREATE TRIGGER trigger_notify_waitlist
  AFTER INSERT ON parking_spots
  FOR EACH ROW
  EXECUTE FUNCTION notify_waitlist_on_new_spot();
