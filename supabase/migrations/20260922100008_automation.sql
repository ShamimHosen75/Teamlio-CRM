-- Migration: automation tables
-- automation_workflows, execution_logs

CREATE TABLE public.automation_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  trigger_event text NOT NULL DEFAULT '',
  conditions jsonb NOT NULL DEFAULT '[]',
  actions jsonb NOT NULL DEFAULT '[]',
  enabled boolean NOT NULL DEFAULT false,
  runs integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_workflows TO authenticated;
GRANT ALL ON public.automation_workflows TO service_role;
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY automation_workflows_select ON public.automation_workflows FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY automation_workflows_write ON public.automation_workflows FOR ALL TO authenticated USING (private.is_org_admin(organization_id, auth.uid())) WITH CHECK (private.is_org_admin(organization_id, auth.uid()));
CREATE INDEX automation_workflows_org_idx ON public.automation_workflows(organization_id);
CREATE TRIGGER set_automation_workflows_updated_at BEFORE UPDATE ON public.automation_workflows FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- Execution logs
CREATE TABLE public.execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'Success' CHECK (status IN ('Success', 'Failed', 'Skipped')),
  message text NOT NULL DEFAULT '',
  duration_ms integer NOT NULL DEFAULT 0,
  ran_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.execution_logs TO authenticated;
GRANT ALL ON public.execution_logs TO service_role;
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY execution_logs_select ON public.execution_logs FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY execution_logs_write ON public.execution_logs FOR ALL TO authenticated USING (private.is_org_admin(organization_id, auth.uid())) WITH CHECK (private.is_org_admin(organization_id, auth.uid()));
CREATE INDEX execution_logs_org_idx ON public.execution_logs(organization_id);
CREATE INDEX execution_logs_workflow_idx ON public.execution_logs(workflow_id);
CREATE TRIGGER set_execution_logs_updated_at BEFORE UPDATE ON public.execution_logs FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();
