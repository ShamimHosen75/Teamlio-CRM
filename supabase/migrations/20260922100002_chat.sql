-- Migration: chat_rooms + chat_messages

CREATE TABLE public.chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'Group' CHECK (type IN ('Direct', 'Group', 'Team', 'Project', 'Client')),
  member_ids uuid[] NOT NULL DEFAULT '{}',
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_rooms TO authenticated;
GRANT ALL ON public.chat_rooms TO service_role;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_rooms_select ON public.chat_rooms FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY chat_rooms_insert ON public.chat_rooms FOR INSERT TO authenticated
  WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY chat_rooms_update ON public.chat_rooms FOR UPDATE TO authenticated
  USING (private.is_org_member(organization_id, auth.uid()))
  WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY chat_rooms_delete ON public.chat_rooms FOR DELETE TO authenticated
  USING (private.is_org_admin(organization_id, auth.uid()));

CREATE INDEX chat_rooms_org_idx ON public.chat_rooms(organization_id);
CREATE TRIGGER set_chat_rooms_updated_at BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- Chat messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  reactions jsonb NOT NULL DEFAULT '[]',
  pinned boolean NOT NULL DEFAULT false,
  read_by uuid[] NOT NULL DEFAULT '{}',
  attachment_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_messages_select ON public.chat_messages FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY chat_messages_insert ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY chat_messages_update ON public.chat_messages FOR UPDATE TO authenticated
  USING (private.is_org_member(organization_id, auth.uid()))
  WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY chat_messages_delete ON public.chat_messages FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid()));

CREATE INDEX chat_messages_room_idx ON public.chat_messages(room_id);
CREATE INDEX chat_messages_org_idx ON public.chat_messages(organization_id);
CREATE TRIGGER set_chat_messages_updated_at BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();
