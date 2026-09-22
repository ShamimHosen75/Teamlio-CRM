-- Migration: leave_requests + leave_balances

CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type text NOT NULL DEFAULT 'Annual',
  start_date date NOT NULL,
  end_date date NOT NULL,
  duration_days numeric(4,1) NOT NULL DEFAULT 1,
  half_day boolean NOT NULL DEFAULT false,
  reason text NOT NULL DEFAULT '',
  approver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Draft', 'Pending', 'Approved', 'Rejected', 'Cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_requests TO authenticated;
GRANT ALL ON public.leave_requests TO service_role;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_requests_select ON public.leave_requests FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY leave_requests_insert ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY leave_requests_update ON public.leave_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid()));
CREATE POLICY leave_requests_delete ON public.leave_requests FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid()));

CREATE INDEX leave_requests_org_idx ON public.leave_requests(organization_id);
CREATE INDEX leave_requests_user_idx ON public.leave_requests(user_id);
CREATE TRIGGER set_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- Leave balances
CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type text NOT NULL DEFAULT 'Annual',
  entitled numeric(4,1) NOT NULL DEFAULT 0,
  used numeric(4,1) NOT NULL DEFAULT 0,
  pending numeric(4,1) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, leave_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_balances TO authenticated;
GRANT ALL ON public.leave_balances TO service_role;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_balances_select ON public.leave_balances FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY leave_balances_write ON public.leave_balances FOR ALL TO authenticated
  USING (private.is_org_admin(organization_id, auth.uid()))
  WITH CHECK (private.is_org_admin(organization_id, auth.uid()));

CREATE INDEX leave_balances_org_idx ON public.leave_balances(organization_id);
CREATE TRIGGER set_leave_balances_updated_at BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();
