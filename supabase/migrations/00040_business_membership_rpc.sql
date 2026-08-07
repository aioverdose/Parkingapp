-- B2B membership flows: self-serve business creation and member management.
--
-- All mutations go through SECURITY DEFINER RPCs so role checks live in one
-- place (and work regardless of which client the caller uses). RLS on the
-- tables remains as defense-in-depth for direct anon/authenticated access.

-- ---------------------------------------------------------------------------
-- 1. create_business: create business + its private network + owner (admin)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_business(
  p_name TEXT,
  p_slug TEXT,
  p_description TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_operating_lat DOUBLE PRECISION DEFAULT NULL,
  p_operating_lng DOUBLE PRECISION DEFAULT NULL,
  p_operating_radius_meters INTEGER DEFAULT NULL
)
RETURNS public.businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_network public.networks;
  v_business public.businesses;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.networks (name, slug, network_type)
  VALUES (p_name, p_slug || '-network', 'private')
  RETURNING * INTO v_network;

  INSERT INTO public.businesses (
    name, slug, description, address, phone,
    operating_lat, operating_lng, operating_radius_meters,
    primary_network_id
  )
  VALUES (
    p_name, p_slug, p_description, p_address, p_phone,
    p_operating_lat, p_operating_lng, p_operating_radius_meters,
    v_network.id
  )
  RETURNING * INTO v_business;

  INSERT INTO public.network_businesses (network_id, business_id)
  VALUES (v_network.id, v_business.id);

  INSERT INTO public.business_members (business_id, user_id, role, status)
  VALUES (v_business.id, v_user_id, 'admin', 'active');

  RETURN v_business;
END;
$$;

COMMENT ON FUNCTION public.create_business(...) IS 'Self-serve business signup: creates the business, a private network, and makes the caller an admin';

-- ---------------------------------------------------------------------------
-- 2. join_business: self-join as a member
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_business(p_business_id UUID)
RETURNS public.business_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_business public.businesses;
  v_membership public.business_members;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_business FROM public.businesses WHERE id = p_business_id;
  IF v_business.id IS NULL THEN
    RAISE EXCEPTION 'Business not found';
  END IF;
  IF v_business.status NOT IN ('active', 'trialing') THEN
    RAISE EXCEPTION 'Business is not accepting members';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = p_business_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Already a member';
  END IF;

  INSERT INTO public.business_members (business_id, user_id, role, status)
  VALUES (p_business_id, v_user_id, 'member', 'active')
  RETURNING * INTO v_membership;

  RETURN v_membership;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. add_business_member: admin invites/onboards a user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_business_member(
  p_business_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'member'
)
RETURNS public.business_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership public.business_members;
  v_role TEXT := p_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.is_platform_admin() OR public.current_user_business_role(p_business_id) = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_role NOT IN ('admin', 'staff', 'member') THEN
    v_role := 'member';
  END IF;

  INSERT INTO public.business_members (business_id, user_id, role, status)
  VALUES (p_business_id, p_user_id, v_role, 'active')
  ON CONFLICT (business_id, user_id)
  DO UPDATE SET role = excluded.role, status = 'active'
  RETURNING * INTO v_membership;

  RETURN v_membership;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. update_business_member: admin edits role/status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_business_member(
  p_business_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.is_platform_admin() OR public.current_user_business_role(p_business_id) = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.business_members
  SET role = COALESCE(p_role, role),
      status = COALESCE(p_status, status)
  WHERE business_id = p_business_id AND user_id = p_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. remove_business_member: admin removes a member (never the last admin)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_business_member(
  p_business_id UUID,
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.is_platform_admin() OR public.current_user_business_role(p_business_id) = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COUNT(*) INTO v_admin_count
  FROM public.business_members
  WHERE business_id = p_business_id AND role = 'admin' AND status = 'active';

  IF p_user_id = auth.uid() AND NOT public.is_platform_admin() AND v_admin_count <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last active admin';
  END IF;

  DELETE FROM public.business_members
  WHERE business_id = p_business_id AND user_id = p_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. leave_business: a member removes themselves
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leave_business(p_business_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_admin_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COUNT(*) INTO v_admin_count
  FROM public.business_members
  WHERE business_id = p_business_id AND role = 'admin' AND status = 'active';

  IF v_admin_count <= 1 THEN
    RAISE EXCEPTION 'Cannot leave as the last active admin';
  END IF;

  DELETE FROM public.business_members
  WHERE business_id = p_business_id AND user_id = v_user_id;
END;
$$;
