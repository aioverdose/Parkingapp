ALTER TABLE public.community_post_media
  ADD COLUMN IF NOT EXISTS media_url TEXT;
