-- Stripe webhook idempotency + atomic credit grant. Credit is only granted by
-- complete_credit_purchase, which is guarded by the credit_purchases row being
-- in 'pending' state, so duplicate or retried webhook deliveries can never
-- double-grant. webhook_events additionally records fully-processed Stripe
-- events so replays short-circuit.

CREATE TABLE IF NOT EXISTS public.webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON public.webhook_events (processed_at);

-- Atomically mark the purchase completed AND increment match_credits. Returns
-- the number of credits granted (0 when the purchase was already completed,
-- which makes the call idempotent for retried deliveries).
CREATE OR REPLACE FUNCTION public.complete_credit_purchase(
  p_user_id UUID,
  p_quantity INTEGER,
  p_session_id TEXT,
  p_payment_intent TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.credit_purchases
  SET status = 'completed',
      stripe_payment_intent_id = p_payment_intent,
      completed_at = now()
  WHERE stripe_session_id = p_session_id
    AND user_id = p_user_id
    AND status = 'pending';
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.users
  SET match_credits = match_credits + p_quantity
  WHERE id = p_user_id;

  RETURN p_quantity;
END;
$$;

-- Mark a Stripe event as processed. Returns true on first insert, false if it
-- was already recorded (replay).
CREATE OR REPLACE FUNCTION public.insert_webhook_event(
  p_event_id TEXT,
  p_event_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.webhook_events (event_id, event_type)
  VALUES (p_event_id, p_event_type)
  ON CONFLICT (event_id) DO NOTHING;
  RETURN FOUND;
END;
$$;
