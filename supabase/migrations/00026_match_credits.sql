-- Match credits: first 5 matches free, then $5.99 per match

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS match_credits INTEGER NOT NULL DEFAULT 5;

CREATE OR REPLACE FUNCTION deduct_match_credit(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
  SET match_credits = GREATEST(match_credits - 1, 0)
  WHERE id = p_user_id;
END;
$$;

-- Track credit purchases via Stripe
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL, -- in cents ($5.99 = 599)
  total_cents INTEGER NOT NULL,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own purchases"
  ON credit_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases"
  ON credit_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_user ON credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_session ON credit_purchases(stripe_session_id);
