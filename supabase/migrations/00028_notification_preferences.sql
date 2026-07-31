-- Notification preferences: per-user opt-in for notification categories
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{
  "match": true,
  "claim": true,
  "tip": true,
  "agent": true,
  "waitlist": true,
  "promotional": false
}';
