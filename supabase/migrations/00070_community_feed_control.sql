-- Community feed controls are independent from post data so disabling them is reversible.
INSERT INTO public.feature_flags (name, enabled, description)
VALUES ('community_feed', true, 'Enable the public community feed and composer.')
ON CONFLICT (name) DO NOTHING;

UPDATE public.community_settings
SET draft = '{"feed_enabled":true,"composer_enabled":true,"require_moderation":false,"allow_media":true,"max_media_mb":10}'::jsonb || COALESCE(draft, '{}'::jsonb),
    published = '{"feed_enabled":true,"composer_enabled":true,"require_moderation":false,"allow_media":true,"max_media_mb":10}'::jsonb || COALESCE(published, '{}'::jsonb),
    updated_at = now()
WHERE key = 'default';

INSERT INTO public.community_settings (key, draft, published, status)
VALUES ('default', '{"feed_enabled":true,"composer_enabled":true,"require_moderation":false,"allow_media":true,"max_media_mb":10}'::jsonb, '{"feed_enabled":true,"composer_enabled":true,"require_moderation":false,"allow_media":true,"max_media_mb":10}'::jsonb, 'published')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS community_posts_status_check;
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_status_check
  CHECK (status IN ('draft', 'published', 'held', 'deleted'));
