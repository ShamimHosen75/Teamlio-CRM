-- Migration: daily_work_updates

CREATE TABLE public.daily_work_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  update_date date NOT NULL DEFAULT CURRENT_DATE,
  completed_today text NOT NULL DEFAULT '',
  working_on text NOT NULL DEFAULT '',
  next_plan text NOT NULL DEFAULT '',
  blockers text NOT NULL DEFAULT '',
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  task_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Late', 'Missing', 'Reviewed')),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_work_updates TO authenticated;
GRANT ALL ON public.daily_work_updates TO service_role;
ALTER TABLE public.daily_work_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_updates_select ON public.daily_work_updates FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY daily_updates_insert ON public.daily_work_updates FOR INSERT TO authenticated
  WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY daily_updates_update ON public.daily_work_updates FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid()));
CREATE POLICY daily_updates_delete ON public.daily_work_updates FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid()));

CREATE INDEX daily_updates_org_idx ON public.daily_work_updates(organization_id);
CREATE INDEX daily_updates_date_idx ON public.daily_work_updates(update_date);
CREATE INDEX daily_updates_user_idx ON public.daily_work_updates(user_id);
CREATE TRIGGER set_daily_updates_updated_at BEFORE UPDATE ON public.daily_work_updates
  FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();
