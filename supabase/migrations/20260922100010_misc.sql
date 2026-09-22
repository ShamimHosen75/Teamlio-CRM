-- Migration: misc tables
-- files, milestones, project_templates, contacts, comments

-- Files (metadata for uploaded files)
CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  folder text NOT NULL DEFAULT '',
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  size_kb integer NOT NULL DEFAULT 0,
  uploader_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.crm_clients(id) ON DELETE SET NULL,
  task_id uuid,
  shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO authenticated;
GRANT ALL ON public.files TO service_role;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY files_select ON public.files FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY files_write ON public.files FOR ALL TO authenticated USING (private.is_org_member(organization_id, auth.uid())) WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE INDEX files_org_idx ON public.files(organization_id);
CREATE TRIGGER set_files_updated_at BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- Milestones
CREATE TABLE public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  due_date date,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'In Progress', 'Completed', 'Overdue')),
  deliverables text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestones TO authenticated;
GRANT ALL ON public.milestones TO service_role;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY milestones_select ON public.milestones FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY milestones_write ON public.milestones FOR ALL TO authenticated USING (private.is_org_member(organization_id, auth.uid())) WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE INDEX milestones_project_idx ON public.milestones(project_id);
CREATE TRIGGER set_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- Project templates
CREATE TABLE public.project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  description text NOT NULL DEFAULT '',
  default_duration_days integer NOT NULL DEFAULT 30,
  task_titles text[] NOT NULL DEFAULT '{}',
  milestone_titles text[] NOT NULL DEFAULT '{}',
  workflow_stages text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_templates TO authenticated;
GRANT ALL ON public.project_templates TO service_role;
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_templates_select ON public.project_templates FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY project_templates_write ON public.project_templates FOR ALL TO authenticated USING (private.is_org_admin(organization_id, auth.uid())) WITH CHECK (private.is_org_admin(organization_id, auth.uid()));
CREATE INDEX project_templates_org_idx ON public.project_templates(organization_id);
CREATE TRIGGER set_project_templates_updated_at BEFORE UPDATE ON public.project_templates FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- Contacts (associated with CRM clients)
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.crm_clients(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  designation text NOT NULL DEFAULT '',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY contacts_select ON public.contacts FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY contacts_write ON public.contacts FOR ALL TO authenticated USING (private.is_org_member(organization_id, auth.uid())) WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE INDEX contacts_client_idx ON public.contacts(client_id);
CREATE TRIGGER set_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- Comments (polymorphic: tasks, projects, etc.)
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL DEFAULT '',
  entity_id uuid NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_select ON public.comments FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY comments_write ON public.comments FOR ALL TO authenticated USING (private.is_org_member(organization_id, auth.uid())) WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE INDEX comments_entity_idx ON public.comments(entity_id);
CREATE INDEX comments_org_idx ON public.comments(organization_id);
CREATE TRIGGER set_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();
