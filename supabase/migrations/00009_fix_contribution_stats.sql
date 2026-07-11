-- Ensure a public.users row exists for a given auth user
CREATE OR REPLACE FUNCTION public.ensure_user_exists(p_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO public.users (id, email)
  SELECT p_user_id, email
  FROM auth.users WHERE id = p_user_id
  ON CONFLICT (id) DO NOTHING;
$$;

-- Ensure public.users row exists before updating contribution_stats
CREATE OR REPLACE FUNCTION public.update_stats_on_spot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  SELECT NEW.user_id, email
  FROM auth.users WHERE id = NEW.user_id
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.contribution_stats (user_id, spots_posted, updated_at)
  VALUES (NEW.user_id, 1, now())
  ON CONFLICT (user_id) DO UPDATE SET
    spots_posted = contribution_stats.spots_posted + 1,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_stats_on_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hours NUMERIC(10,2);
BEGIN
  INSERT INTO public.users (id, email)
  SELECT OLD.user_id, email
  FROM auth.users WHERE id = OLD.user_id
  ON CONFLICT (id) DO NOTHING;

  hours := EXTRACT(EPOCH FROM (NEW.leaving_at - OLD.leaving_at)) / 3600;
  INSERT INTO public.contribution_stats (user_id, spots_claimed, hours_saved, updated_at)
  VALUES (OLD.user_id, 1, hours, now())
  ON CONFLICT (user_id) DO UPDATE SET
    spots_claimed = contribution_stats.spots_claimed + 1,
    hours_saved = contribution_stats.hours_saved + hours,
    updated_at = now();
  RETURN NEW;
END;
$$;
