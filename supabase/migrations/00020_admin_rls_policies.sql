-- Admin read policies: allow admins to read all rows in tables needed for the dashboard
-- Uses SECURITY DEFINER to avoid infinite recursion on users table

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Drop existing admin policies if they exist (idempotent)
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can read all parking spots" ON public.parking_spots;
DROP POLICY IF EXISTS "Admins can read all chats" ON public.ephemeral_chats;

CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can read all parking spots"
  ON public.parking_spots FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can read all chats"
  ON public.ephemeral_chats FOR SELECT
  USING (public.is_admin());
