-- Pilot hardening: enforce business status and active-member seat limits at the
-- database boundary. The row lock makes concurrent joins deterministic.

CREATE OR REPLACE FUNCTION public.enforce_business_member_guardrails()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_seats_limit INTEGER;
  v_active_members INTEGER;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status <> 'active') THEN
    SELECT status, seats_limit
    INTO v_status, v_seats_limit
    FROM public.businesses
    WHERE id = NEW.business_id
    FOR UPDATE;

    IF v_status IS NULL THEN
      RAISE EXCEPTION 'Business not found';
    END IF;
    IF v_status NOT IN ('active', 'trialing') THEN
      RAISE EXCEPTION 'Business is not accepting members';
    END IF;

    SELECT COUNT(*)
    INTO v_active_members
    FROM public.business_members
    WHERE business_id = NEW.business_id
      AND status = 'active';

    IF NEW.status = 'active' AND v_active_members >= v_seats_limit THEN
      RAISE EXCEPTION 'Business seat limit reached';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_business_member_guardrails ON public.business_members;
CREATE TRIGGER trg_enforce_business_member_guardrails
  BEFORE INSERT OR UPDATE OF status ON public.business_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_business_member_guardrails();
