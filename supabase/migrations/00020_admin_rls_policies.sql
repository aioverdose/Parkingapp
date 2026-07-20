-- Admin read policies: allow admins to read all rows in tables needed for the dashboard

CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

CREATE POLICY "Admins can read all parking spots"
  ON public.parking_spots FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

CREATE POLICY "Admins can read all chats"
  ON public.ephemeral_chats FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );
