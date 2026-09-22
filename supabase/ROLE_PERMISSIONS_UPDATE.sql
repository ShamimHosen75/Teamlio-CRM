-- ==============================================================================
-- ROLE-BASED PERMISSIONS UPDATE & AUTO-OWNER ASSIGNMENT
-- Paste this script into the Supabase SQL Editor and click RUN
-- ==============================================================================

-- 1. Ensure schema private exists
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2. Projects RLS policies: Allow owners, admins, and managers to create projects
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated
WITH CHECK (
  private.is_org_admin(organization_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin', 'manager')
  )
);

DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated
USING (
  private.is_org_admin(organization_id, auth.uid())
  OR manager_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin', 'manager')
  )
)
WITH CHECK (
  private.is_org_admin(organization_id, auth.uid())
  OR manager_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin', 'manager')
  )
);

-- 3. Tasks RLS policies: Allow any organization member to create & update tasks
DROP POLICY IF EXISTS "project_tasks_insert" ON public.project_tasks;
CREATE POLICY "project_tasks_insert" ON public.project_tasks FOR INSERT TO authenticated
WITH CHECK (
  private.is_org_member(organization_id, auth.uid())
);

DROP POLICY IF EXISTS "project_tasks_update" ON public.project_tasks;
CREATE POLICY "project_tasks_update" ON public.project_tasks FOR UPDATE TO authenticated
USING (
  private.is_org_member(organization_id, auth.uid())
)
WITH CHECK (
  private.is_org_member(organization_id, auth.uid())
);

-- 4. Organization members: Allow users to insert themselves as owner when creating an org
DROP POLICY IF EXISTS "org_members_insert" ON public.organization_members;
CREATE POLICY "org_members_insert" ON public.organization_members FOR INSERT TO authenticated
WITH CHECK (
  private.is_org_admin(organization_id, auth.uid())
  OR (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid()))
);

-- 5. Auto-assign organization creator as 'owner' in organization_members on org insert
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role, status, job_title)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active', 'Owner')
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
CREATE TRIGGER on_organization_created
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_organization();

-- 6. Backfill existing organizations so all owners are in organization_members
INSERT INTO public.organization_members (organization_id, user_id, role, status, job_title)
SELECT o.id, o.owner_id, 'owner', 'active', 'Owner'
FROM public.organizations o
ON CONFLICT (organization_id, user_id) DO NOTHING;
