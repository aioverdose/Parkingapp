-- Web Push subscriptions for PWA notifications

CREATE TABLE IF NOT EXISTS device_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE device_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own push subscriptions"
  ON device_push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
  ON device_push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
  ON device_push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_endpoint ON device_push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_user ON device_push_subscriptions(user_id);
