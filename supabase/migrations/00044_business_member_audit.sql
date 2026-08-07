-- Pilot hardening: retain a minimal audit record for membership removal.

CREATE TABLE IF NOT EXISTS public.business_member_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_member_audit_business_time
  ON public.business_member_audit (business_id, created_at DESC);

ALTER TABLE public.business_member_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business admins can read membership audit"
  ON public.business_member_audit FOR SELECT
  USING (
    public.is_platform_admin()
    OR public.current_user_business_role(business_id) = 'admin'
  );

CREATE OR REPLACE FUNCTION public.audit_business_member_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.business_member_audit (
    business_id,
    target_user_id,
    actor_user_id,
    action
  )
  VALUES (OLD.business_id, OLD.user_id, auth.uid(), 'removed');
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_business_member_removal ON public.business_members;
CREATE TRIGGER trg_audit_business_member_removal
  AFTER DELETE ON public.business_members
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_business_member_removal();
