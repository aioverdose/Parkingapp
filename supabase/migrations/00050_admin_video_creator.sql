-- Admin-created video storyboards and render-job metadata.
CREATE TABLE IF NOT EXISTS public.video_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'storyboarding', 'ready', 'rendering', 'completed', 'failed')),
  aspect_ratio TEXT NOT NULL DEFAULT '9:16' CHECK (aspect_ratio IN ('9:16', '16:9', '1:1')),
  fps INTEGER NOT NULL DEFAULT 30 CHECK (fps BETWEEN 1 AND 60),
  duration_in_frames INTEGER NOT NULL DEFAULT 900 CHECK (duration_in_frames > 0),
  voice JSONB NOT NULL DEFAULT '{}'::jsonb,
  music JSONB NOT NULL DEFAULT '{}'::jsonb,
  brand JSONB NOT NULL DEFAULT '{}'::jsonb,
  scenes JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.video_render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.video_projects(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'rendering', 'completed', 'failed')),
  provider TEXT NOT NULL DEFAULT 'mock',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  output_url TEXT,
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_projects_updated ON public.video_projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_render_jobs_project ON public.video_render_jobs(project_id, created_at DESC);

ALTER TABLE public.video_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_render_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage video projects" ON public.video_projects FOR ALL
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "Platform admins can manage video render jobs" ON public.video_render_jobs FOR ALL
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

COMMENT ON TABLE public.video_projects IS 'Admin storyboard projects for product demo videos';
COMMENT ON TABLE public.video_render_jobs IS 'Render provider status and output metadata; mock jobs are not real MP4 renders';
