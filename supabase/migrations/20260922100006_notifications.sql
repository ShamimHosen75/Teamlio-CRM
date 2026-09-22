-- Migration: notifications

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'System Alert',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can see their own notifications, or org members can see broadcast ones (user_id IS NULL)
CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid() OR user_id IS NULL)
    AND private.is_org_member(organization_id, auth.uid())
  );
CREATE POLICY notifications_insert ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid()));
CREATE POLICY notifications_delete ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid()));

CREATE INDEX notifications_org_idx ON public.notifications(organization_id);
CREATE INDEX notifications_user_idx ON public.notifications(user_id);
CREATE TRIGGER set_notifications_updated_at BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();
