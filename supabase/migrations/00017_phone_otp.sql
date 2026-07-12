-- Phone OTP table for direct Twilio-based SMS verification
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own OTPs"
  ON public.phone_otps FOR SELECT
  USING (auth.uid() = user_id);

-- Cleanup expired OTPs automatically
CREATE INDEX IF NOT EXISTS idx_phone_otps_expires ON public.phone_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_phone_otps_user ON public.phone_otps(user_id, phone, code);
