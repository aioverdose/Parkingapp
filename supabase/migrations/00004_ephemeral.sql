-- Ephemeral spot handoff chats
CREATE TABLE IF NOT EXISTS public.ephemeral_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES public.parking_spots(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ephemeral_chats_spot ON public.ephemeral_chats(spot_id);
CREATE INDEX IF NOT EXISTS idx_ephemeral_chats_participants ON public.ephemeral_chats(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_ephemeral_chats_status ON public.ephemeral_chats(status);
CREATE INDEX IF NOT EXISTS idx_ephemeral_chats_expires ON public.ephemeral_chats(expires_at) WHERE status = 'active';

ALTER TABLE public.ephemeral_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read chat"
  ON public.ephemeral_chats FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Participants can insert chat"
  ON public.ephemeral_chats FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Participants can update chat"
  ON public.ephemeral_chats FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Ephemeral messages
CREATE TABLE IF NOT EXISTS public.ephemeral_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.ephemeral_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ephemeral_messages_chat ON public.ephemeral_messages(chat_id, created_at);

ALTER TABLE public.ephemeral_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants can read messages"
  ON public.ephemeral_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ephemeral_chats
      WHERE id = chat_id AND (auth.uid() = sender_id OR auth.uid() = receiver_id)
    )
  );

CREATE POLICY "Chat participants can insert messages"
  ON public.ephemeral_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ephemeral_chats
      WHERE id = chat_id AND (auth.uid() = sender_id OR auth.uid() = receiver_id)
    )
  );

-- Departure pings
CREATE TABLE IF NOT EXISTS public.departure_pings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters DOUBLE PRECISION NOT NULL DEFAULT 500,
  leaving_in_minutes INT NOT NULL CHECK (leaving_in_minutes IN (5, 10, 15)),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_departure_pings_user ON public.departure_pings(user_id);
CREATE INDEX IF NOT EXISTS idx_departure_pings_location ON public.departure_pings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_departure_pings_expires ON public.departure_pings(expires_at);

ALTER TABLE public.departure_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active departure pings"
  ON public.departure_pings FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Users can insert their own pings"
  ON public.departure_pings FOR INSERT
  WITH CHECK (auth.uid() = user_id);
