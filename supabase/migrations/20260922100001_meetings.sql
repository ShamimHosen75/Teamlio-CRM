-- Migration: meetings
-- Meetings for calendar, scheduling, and project coordination

CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'Internal' CHECK (type IN ('Internal', 'Project', 'Client', 'Sales')),
  participant_ids uuid[] NOT NULL DEFAULT '{}',
  client_id uuid REFERENCES public.crm_clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  meeting_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time text NOT NULL DEFAULT '09:00',
  end_time text NOT NULL DEFAULT '10:00',
  meeting_url text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  agenda text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY meetings_select ON public.meetings FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY meetings_insert ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY meetings_update ON public.meetings FOR UPDATE TO authenticated
  USING (private.is_org_member(organization_id, auth.uid()))
  WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY meetings_delete ON public.meetings FOR DELETE TO authenticated
  USING (private.is_org_admin(organization_id, auth.uid()));

CREATE INDEX meetings_org_idx ON public.meetings(organization_id);
CREATE INDEX meetings_date_idx ON public.meetings(meeting_date);
CREATE TRIGGER set_meetings_updated_at BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();
