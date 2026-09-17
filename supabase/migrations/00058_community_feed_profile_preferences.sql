-- Community feed uses coarse area labels only. Exact coordinates and attachments
-- are intentionally not part of this MVP schema.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_color TEXT NOT NULL DEFAULT 'blue',
  ADD COLUMN IF NOT EXISTS avatar_preset TEXT NOT NULL DEFAULT 'initials';

CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('neighborhood', 'question', 'alert', 'event', 'business')),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2_000),
  area_label TEXT NOT NULL CHECK (char_length(area_label) BETWEEN 1 AND 120),
  sponsored BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'held', 'deleted')),
  moderation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1_000),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'held', 'deleted')),
  moderation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_reactions (
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL DEFAULT 'support' CHECK (reaction IN ('support', 'helpful')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('harassment', 'spam', 'threat', 'fraud', 'privacy', 'other')),
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 1_000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((post_id IS NOT NULL) <> (comment_id IS NOT NULL)),
  UNIQUE (reporter_id, post_id),
  UNIQUE (reporter_id, comment_id)
);

CREATE TABLE IF NOT EXISTS public.community_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, author_id),
  CHECK (user_id <> author_id)
);

CREATE INDEX IF NOT EXISTS idx_community_posts_feed ON public.community_posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON public.community_comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON public.community_reports(status, created_at DESC);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published community posts are readable" ON public.community_posts
  FOR SELECT USING (status = 'published' OR author_id = auth.uid());
CREATE POLICY "Users can create their own community posts" ON public.community_posts
  FOR INSERT WITH CHECK (author_id = auth.uid() AND status = 'held');
CREATE POLICY "Users can delete their own community posts" ON public.community_posts
  FOR DELETE USING (author_id = auth.uid());

CREATE POLICY "Published community comments are readable" ON public.community_comments
  FOR SELECT USING (status = 'published' OR author_id = auth.uid());
CREATE POLICY "Users can create their own community comments" ON public.community_comments
  FOR INSERT WITH CHECK (author_id = auth.uid() AND status = 'held');
CREATE POLICY "Users can delete their own community comments" ON public.community_comments
  FOR DELETE USING (author_id = auth.uid());

CREATE POLICY "Users can read community reactions" ON public.community_reactions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage their own reactions" ON public.community_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove their own reactions" ON public.community_reactions
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can submit community reports" ON public.community_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Users can read their own community reports" ON public.community_reports
  FOR SELECT USING (reporter_id = auth.uid());
CREATE POLICY "Users can manage their own community mutes" ON public.community_mutes
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
