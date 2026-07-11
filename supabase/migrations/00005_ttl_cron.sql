-- TTL cleanup functions

-- Expire old ephemeral chats (active past expires_at or completed for > 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_ephemeral_chats()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.ephemeral_chats
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < now();

  DELETE FROM public.ephemeral_chats
  WHERE status IN ('completed', 'expired') AND closed_at < now() - INTERVAL '1 hour';
$$;

-- Expire old departure pings
CREATE OR REPLACE FUNCTION public.cleanup_departure_pings()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.departure_pings
  WHERE expires_at < now();
$$;

-- Streak maintenance: reset daily streaks for users with no activity
CREATE OR REPLACE FUNCTION public.maintain_streaks()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.contribution_stats
  SET
    streak_7d = CASE
      WHEN updated_at > now() - INTERVAL '2 days' THEN streak_7d + 1
      ELSE 0
    END,
    streak_30d = CASE
      WHEN updated_at > now() - INTERVAL '2 days' THEN streak_30d + 1
      ELSE 0
    END
  WHERE updated_at < now() - INTERVAL '1 day';
$$;

-- Trigger to auto-close chat when spot is claimed (handoff complete)
CREATE OR REPLACE FUNCTION public.auto_close_chat_on_claim()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.ephemeral_chats
  SET status = 'completed', closed_at = now()
  WHERE spot_id = NEW.id AND status = 'active';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_close_chat ON public.parking_spots;
CREATE TRIGGER trigger_auto_close_chat
  AFTER UPDATE OF status ON public.parking_spots
  FOR EACH ROW
  WHEN (OLD.status = 'active' AND NEW.status = 'taken')
  EXECUTE FUNCTION public.auto_close_chat_on_claim();

-- Trigger to update contribution_stats on new spot
CREATE OR REPLACE FUNCTION public.update_stats_on_spot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.contribution_stats (user_id, spots_posted, updated_at)
  VALUES (NEW.user_id, 1, now())
  ON CONFLICT (user_id) DO UPDATE SET
    spots_posted = contribution_stats.spots_posted + 1,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_stats_on_spot ON public.parking_spots;
CREATE TRIGGER trigger_update_stats_on_spot
  AFTER INSERT ON public.parking_spots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stats_on_spot();

-- Trigger to update contribution_stats on claim
CREATE OR REPLACE FUNCTION public.update_stats_on_claim()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  hours NUMERIC(10,2);
BEGIN
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

DROP TRIGGER IF EXISTS trigger_update_stats_on_claim ON public.parking_spots;
CREATE TRIGGER trigger_update_stats_on_claim
  AFTER UPDATE OF status ON public.parking_spots
  FOR EACH ROW
  WHEN (OLD.status = 'active' AND NEW.status = 'taken')
  EXECUTE FUNCTION public.update_stats_on_claim();
