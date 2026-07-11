-- SpotMatch: rename leaving_at to departure_time, add return_time, add spot_matches table

ALTER TABLE parking_spots RENAME COLUMN leaving_at TO departure_time;

ALTER TABLE parking_spots ADD COLUMN IF NOT EXISTS return_time TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS spot_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES parking_spots(id) ON DELETE CASCADE,
  spot_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seeker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed_by_owner', 'confirmed_by_seeker', 'confirmed', 'rejected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spot_matches_spot_id ON spot_matches(spot_id);
CREATE INDEX IF NOT EXISTS idx_spot_matches_seeker_id ON spot_matches(seeker_id);
CREATE INDEX IF NOT EXISTS idx_spot_matches_status ON spot_matches(status);

-- Auto-update updated_at on spot_matches
CREATE OR REPLACE FUNCTION update_spot_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_spot_matches_updated_at
  BEFORE UPDATE ON spot_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_spot_matches_updated_at();

-- Notify seeker on match creation
CREATE OR REPLACE FUNCTION notify_match_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type)
  VALUES
    (NEW.seeker_id, 'Match found!', 'A spot matching your needs is available. Confirm to claim it.', 'match'),
    (NEW.spot_owner_id, 'Match found!', 'Someone wants your spot. Confirm the match to proceed.', 'match');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_match_created
  AFTER INSERT ON spot_matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_match_created();

-- Notify both parties on confirmation
CREATE OR REPLACE FUNCTION notify_match_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES
      (NEW.seeker_id, 'Match confirmed!', 'Your match is confirmed. Chat with the spot owner to coordinate.', 'match'),
      (NEW.spot_owner_id, 'Match confirmed!', 'Your match is confirmed. Chat with the driver to coordinate.', 'match');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_match_confirmed
  AFTER UPDATE ON spot_matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_match_confirmed();
