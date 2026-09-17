ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES public.spot_matches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_match_id ON public.notifications(match_id);

CREATE OR REPLACE FUNCTION public.notify_match_created()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'offered' THEN
    INSERT INTO public.notifications (user_id, title, message, type, match_id)
    VALUES (NEW.seeker_id, 'Potential parking match', 'Review the departure signal and accept if you want to coordinate.', 'match', NEW.id);
  ELSE
    INSERT INTO public.notifications (user_id, title, message, type, match_id)
    VALUES
      (NEW.seeker_id, 'Match found!', 'A compatible departure signal is ready for your review.', 'match', NEW.id),
      (NEW.spot_owner_id, 'Match found!', 'A nearby driver matches your departure signal. Review and accept to coordinate.', 'match', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
