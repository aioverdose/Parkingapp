-- B2B / white-label parking coordination: businesses, membership, and networks.
--
-- SpotMatch is becoming operational coordination software sold to businesses
-- (restaurants/bars/operators) rather than a consumer peer-to-peer marketplace.
-- Spots are never sold, rented, or reserved; this model only scopes who can
-- coordinate over a given spot.
--
-- Changes:
--  1. businesses: subscriber account (plan/status/seats) + optional operating area.
--  2. business_members: who belongs to a business and what they can do
--     (admin / staff / member).
--  3. networks: private (one business) or shared (neighborhood group) scopes.
--  4. network_businesses: which businesses participate in a shared network.
--  5. parking_spots + spot_matches: business_id / network_id columns so
--     coordination is scoped to the network and attributable for dashboards.
--  6. RLS: membership-scoped reads/writes + platform-admin management.

-- ---------------------------------------------------------------------------
-- 0. Shared authz helpers (SECURITY DEFINER so RLS can use them safely)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_platform_admin() IS 'True when the current user is a platform admin (role = admin)';

CREATE OR REPLACE FUNCTION public.current_user_business_role(p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT bm.role INTO v_role
  FROM public.business_members bm
  WHERE bm.business_id = p_business_id
    AND bm.user_id = auth.uid()
    AND bm.status = 'active';
  RETURN v_role;
END;
$$;

COMMENT ON FUNCTION public.current_user_business_role(p_business_id UUID) IS 'Returns the current user role in a business (admin/staff/member) or NULL when not an active member';

CREATE OR REPLACE FUNCTION public.user_is_network_member(p_network_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members bm
    JOIN public.network_businesses nb ON nb.business_id = bm.business_id
    WHERE nb.network_id = p_network_id
      AND bm.user_id = auth.uid()
      AND bm.status = 'active'
  );
$$;

COMMENT ON FUNCTION public.user_is_network_member(p_network_id UUID) IS 'True when the current user is an active member of any business participating in the given network';

-- ---------------------------------------------------------------------------
-- 1. networks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  network_type TEXT NOT NULL DEFAULT 'private' CHECK (network_type IN ('private', 'shared')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.networks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Network members can read networks"
  ON public.networks FOR SELECT
  USING (public.is_platform_admin() OR public.user_is_network_member(id));

CREATE POLICY "Platform admins can manage networks"
  ON public.networks FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 2. businesses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'standard', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('active', 'trialing', 'suspended', 'canceled')),
  seats_limit INTEGER NOT NULL DEFAULT 25,
  address TEXT,
  phone TEXT,
  operating_lat DOUBLE PRECISION,
  operating_lng DOUBLE PRECISION,
  operating_radius_meters INTEGER,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  primary_network_id UUID REFERENCES public.networks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_businesses_primary_network ON public.businesses(primary_network_id);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can read businesses"
  ON public.businesses FOR SELECT
  USING (public.is_platform_admin() OR public.current_user_business_role(id) IS NOT NULL);

CREATE POLICY "Business admins can update businesses"
  ON public.businesses FOR UPDATE
  USING (public.is_platform_admin() OR public.current_user_business_role(id) = 'admin')
  WITH CHECK (public.is_platform_admin() OR public.current_user_business_role(id) = 'admin');

CREATE POLICY "Platform admins can manage businesses"
  ON public.businesses FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 3. network_businesses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.network_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES public.networks(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (network_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_network_businesses_business ON public.network_businesses(business_id);

ALTER TABLE public.network_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Network members can read network_businesses"
  ON public.network_businesses FOR SELECT
  USING (public.is_platform_admin() OR public.user_is_network_member(network_id));

CREATE POLICY "Platform admins can manage network_businesses"
  ON public.network_businesses FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 4. business_members
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'staff', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_members_user ON public.business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_business ON public.business_members(business_id, status);

ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can read their roster"
  ON public.business_members FOR SELECT
  USING (
    public.is_platform_admin()
    OR public.current_user_business_role(business_id) IS NOT NULL
  );

CREATE POLICY "Business admins can add members"
  ON public.business_members FOR INSERT
  WITH CHECK (
    public.is_platform_admin()
    OR public.current_user_business_role(business_id) = 'admin'
  );

CREATE POLICY "Business admins can update members"
  ON public.business_members FOR UPDATE
  USING (
    public.is_platform_admin()
    OR public.current_user_business_role(business_id) = 'admin'
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.current_user_business_role(business_id) = 'admin'
  );

CREATE POLICY "Platform admins can manage business_members"
  ON public.business_members FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 5. parking_spots + spot_matches network scoping
-- ---------------------------------------------------------------------------

ALTER TABLE public.parking_spots
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS network_id UUID REFERENCES public.networks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_parking_spots_business ON public.parking_spots(business_id);
CREATE INDEX IF NOT EXISTS idx_parking_spots_network ON public.parking_spots(network_id);

-- A spot posted inside a network is visible to that network's active members
-- (the private coordination surface). Exclusive single-driver awareness is
-- enforced at the matching layer and by the exclusive/public visibility flow.
DROP POLICY IF EXISTS "Network members can read network spots" ON public.parking_spots;
CREATE POLICY "Network members can read network spots"
  ON public.parking_spots FOR SELECT
  USING (network_id IS NOT NULL AND public.user_is_network_member(network_id));

ALTER TABLE public.spot_matches
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS network_id UUID REFERENCES public.networks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_spot_matches_business ON public.spot_matches(business_id);
CREATE INDEX IF NOT EXISTS idx_spot_matches_network ON public.spot_matches(network_id);

COMMENT ON COLUMN public.parking_spots.business_id IS 'Business that posted the spot (dashboard attribution); NULL for consumer posts';
COMMENT ON COLUMN public.parking_spots.network_id IS 'Network the spot coordinates over; NULL means the open consumer flow';
COMMENT ON COLUMN public.spot_matches.business_id IS 'Business the match belongs to (denormalized for dashboards)';
COMMENT ON COLUMN public.spot_matches.network_id IS 'Network the match is scoped to (denormalized for dashboards)';
