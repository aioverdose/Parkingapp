-- Community post media is stored in the public community-media bucket. The
-- database keeps only validated metadata and the object path.
CREATE TABLE IF NOT EXISTS public.community_post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video')),
  storage_path TEXT NOT NULL CHECK (char_length(storage_path) BETWEEN 3 AND 500),
  mime_type TEXT NOT NULL CHECK (char_length(mime_type) BETWEEN 3 AND 120),
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_community_post_media_post ON public.community_post_media(post_id, created_at ASC);

ALTER TABLE public.community_post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published post media is readable" ON public.community_post_media
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND (p.status = 'published' OR p.author_id = auth.uid()))
  );
CREATE POLICY "Users can add media to their own posts" ON public.community_post_media
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.author_id = auth.uid())
  );
CREATE POLICY "Users can update their own post media" ON public.community_post_media
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.author_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.author_id = auth.uid())
  );
CREATE POLICY "Users can delete their own post media" ON public.community_post_media
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.author_id = auth.uid())
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('community-media', 'community-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Community media is publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-media');
CREATE POLICY "Users upload community media in their own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
CREATE POLICY "Users update their own community media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'community-media' AND owner_id = (auth.uid())::text
  ) WITH CHECK (
    bucket_id = 'community-media' AND owner_id = (auth.uid())::text
  );
CREATE POLICY "Users delete their own community media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'community-media' AND owner_id = (auth.uid())::text);
