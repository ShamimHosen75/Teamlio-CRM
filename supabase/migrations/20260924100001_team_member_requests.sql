-- Migration: team_member_requests
-- Admin / Manager / Owner approval system for team member join requests

CREATE TABLE IF NOT EXISTS public.team_member_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_team text NOT NULL DEFAULT 'Member',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message text NOT NULL DEFAULT '',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_member_requests TO authenticated;
GRANT ALL ON public.team_member_requests TO service_role;
ALTER TABLE public.team_member_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_member_requests_select ON public.team_member_requests;
CREATE POLICY team_member_requests_select ON public.team_member_requests FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id, auth.uid()));

DROP POLICY IF EXISTS team_member_requests_insert ON public.team_member_requests;
CREATE POLICY team_member_requests_insert ON public.team_member_requests FOR INSERT TO authenticated
  WITH CHECK (private.is_org_member(organization_id, auth.uid()));

DROP POLICY IF EXISTS team_member_requests_update ON public.team_member_requests;
CREATE POLICY team_member_requests_update ON public.team_member_requests FOR UPDATE TO authenticated
  USING (private.is_org_member(organization_id, auth.uid()))
  WITH CHECK (private.is_org_member(organization_id, auth.uid()));

DROP POLICY IF EXISTS team_member_requests_delete ON public.team_member_requests;
CREATE POLICY team_member_requests_delete ON public.team_member_requests FOR DELETE TO authenticated
  USING (private.is_org_admin(organization_id, auth.uid()));

CREATE INDEX IF NOT EXISTS team_member_requests_org_idx ON public.team_member_requests(organization_id);
CREATE INDEX IF NOT EXISTS team_member_requests_team_idx ON public.team_member_requests(team_id);
CREATE INDEX IF NOT EXISTS team_member_requests_user_idx ON public.team_member_requests(user_id);
CREATE INDEX IF NOT EXISTS team_member_requests_status_idx ON public.team_member_requests(status);
