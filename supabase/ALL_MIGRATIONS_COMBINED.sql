-- =============================================================
-- COMBINED MIGRATIONS: Paste this entire file into Supabase SQL Editor
-- =============================================================

-- 1. MEETINGS
CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'Internal',
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
  status text NOT NULL DEFAULT 'Scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY meetings_select ON public.meetings FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY meetings_insert ON public.meetings FOR INSERT TO authenticated WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY meetings_update ON public.meetings FOR UPDATE TO authenticated USING (private.is_org_member(organization_id, auth.uid())) WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY meetings_delete ON public.meetings FOR DELETE TO authenticated USING (private.is_org_admin(organization_id, auth.uid()));
CREATE INDEX IF NOT EXISTS meetings_org_idx ON public.meetings(organization_id);
CREATE INDEX IF NOT EXISTS meetings_date_idx ON public.meetings(meeting_date);
CREATE TRIGGER set_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 2. CHAT ROOMS
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'Group',
  member_ids uuid[] NOT NULL DEFAULT '{}',
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_rooms TO authenticated;
GRANT ALL ON public.chat_rooms TO service_role;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY chat_rooms_select ON public.chat_rooms FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY chat_rooms_insert ON public.chat_rooms FOR INSERT TO authenticated WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY chat_rooms_update ON public.chat_rooms FOR UPDATE TO authenticated USING (private.is_org_member(organization_id, auth.uid())) WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY chat_rooms_delete ON public.chat_rooms FOR DELETE TO authenticated USING (private.is_org_admin(organization_id, auth.uid()));
CREATE INDEX IF NOT EXISTS chat_rooms_org_idx ON public.chat_rooms(organization_id);
CREATE TRIGGER set_chat_rooms_updated_at BEFORE UPDATE ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 3. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_messages (
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
CREATE POLICY chat_messages_select ON public.chat_messages FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY chat_messages_insert ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY chat_messages_update ON public.chat_messages FOR UPDATE TO authenticated USING (private.is_org_member(organization_id, auth.uid())) WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY chat_messages_delete ON public.chat_messages FOR DELETE TO authenticated USING (author_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid()));
CREATE INDEX IF NOT EXISTS chat_messages_room_idx ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS chat_messages_org_idx ON public.chat_messages(organization_id);
CREATE TRIGGER set_chat_messages_updated_at BEFORE UPDATE ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 4. LEAVE REQUESTS
CREATE TABLE IF NOT EXISTS public.leave_requests (
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
  status text NOT NULL DEFAULT 'Pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_requests TO authenticated;
GRANT ALL ON public.leave_requests TO service_role;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY leave_requests_select ON public.leave_requests FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY leave_requests_insert ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY leave_requests_update ON public.leave_requests FOR UPDATE TO authenticated USING (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid())) WITH CHECK (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid()));
CREATE POLICY leave_requests_delete ON public.leave_requests FOR DELETE TO authenticated USING (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid()));
CREATE INDEX IF NOT EXISTS leave_requests_org_idx ON public.leave_requests(organization_id);
CREATE INDEX IF NOT EXISTS leave_requests_user_idx ON public.leave_requests(user_id);
CREATE TRIGGER set_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 5. LEAVE BALANCES
CREATE TABLE IF NOT EXISTS public.leave_balances (
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
CREATE POLICY leave_balances_select ON public.leave_balances FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY leave_balances_write ON public.leave_balances FOR ALL TO authenticated USING (private.is_org_admin(organization_id, auth.uid())) WITH CHECK (private.is_org_admin(organization_id, auth.uid()));
CREATE INDEX IF NOT EXISTS leave_balances_org_idx ON public.leave_balances(organization_id);
CREATE TRIGGER set_leave_balances_updated_at BEFORE UPDATE ON public.leave_balances FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 6. DAILY WORK UPDATES
CREATE TABLE IF NOT EXISTS public.daily_work_updates (
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
  status text NOT NULL DEFAULT 'Draft',
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_work_updates TO authenticated;
GRANT ALL ON public.daily_work_updates TO service_role;
ALTER TABLE public.daily_work_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_updates_select ON public.daily_work_updates FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY daily_updates_insert ON public.daily_work_updates FOR INSERT TO authenticated WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY daily_updates_update ON public.daily_work_updates FOR UPDATE TO authenticated USING (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid())) WITH CHECK (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid()));
CREATE POLICY daily_updates_delete ON public.daily_work_updates FOR DELETE TO authenticated USING (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid()));
CREATE INDEX IF NOT EXISTS daily_updates_org_idx ON public.daily_work_updates(organization_id);
CREATE INDEX IF NOT EXISTS daily_updates_date_idx ON public.daily_work_updates(update_date);
CREATE INDEX IF NOT EXISTS daily_updates_user_idx ON public.daily_work_updates(user_id);
CREATE TRIGGER set_daily_updates_updated_at BEFORE UPDATE ON public.daily_work_updates FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 7. QUOTATIONS
CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  quote_number text NOT NULL,
  client_id uuid REFERENCES public.crm_clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  items jsonb NOT NULL DEFAULT '[]',
  discount numeric(14,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  terms text NOT NULL DEFAULT '',
  expiry_date date,
  status text NOT NULL DEFAULT 'Draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotations_number_unique UNIQUE (organization_id, quote_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY quotations_select ON public.quotations FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY quotations_write ON public.quotations FOR ALL TO authenticated USING (private.is_org_member(organization_id, auth.uid())) WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE INDEX IF NOT EXISTS quotations_org_idx ON public.quotations(organization_id);
CREATE TRIGGER set_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 8. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
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
CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated USING ((user_id = auth.uid() OR user_id IS NULL) AND private.is_org_member(organization_id, auth.uid()));
CREATE POLICY notifications_insert ON public.notifications FOR INSERT TO authenticated WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid())) WITH CHECK (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid()));
CREATE POLICY notifications_delete ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid() OR private.is_org_admin(organization_id, auth.uid()));
CREATE INDEX IF NOT EXISTS notifications_org_idx ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id);
CREATE TRIGGER set_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 9. CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  client_id uuid REFERENCES public.crm_clients(id) ON DELETE SET NULL,
  objective text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Draft',
  spend numeric(14,2) NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  leads integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  revenue numeric(14,2) NOT NULL DEFAULT 0,
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaigns_select ON public.campaigns FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY campaigns_write ON public.campaigns FOR ALL TO authenticated USING (private.is_org_member(organization_id, auth.uid())) WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE INDEX IF NOT EXISTS campaigns_org_idx ON public.campaigns(organization_id);
CREATE TRIGGER set_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 10. CONTENT ITEMS
CREATE TABLE IF NOT EXISTS public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  caption text NOT NULL DEFAULT '',
  content_type text NOT NULL DEFAULT 'Static Post',
  platform text NOT NULL DEFAULT 'Facebook',
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.crm_clients(id) ON DELETE SET NULL,
  hashtags text[] NOT NULL DEFAULT '{}',
  cta text NOT NULL DEFAULT '',
  destination_url text NOT NULL DEFAULT '',
  writer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  designer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  publish_date date,
  publish_time text NOT NULL DEFAULT '09:00',
  timezone text NOT NULL DEFAULT 'UTC',
  status text NOT NULL DEFAULT 'Idea',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_items TO authenticated;
GRANT ALL ON public.content_items TO service_role;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_items_select ON public.content_items FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY content_items_write ON public.content_items FOR ALL TO authenticated USING (private.is_org_member(organization_id, auth.uid())) WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE INDEX IF NOT EXISTS content_items_org_idx ON public.content_items(organization_id);
CREATE TRIGGER set_content_items_updated_at BEFORE UPDATE ON public.content_items FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 11. SCHEDULED CONTENT
CREATE TABLE IF NOT EXISTS public.scheduled_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content_id uuid REFERENCES public.content_items(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT '',
  account text NOT NULL DEFAULT '',
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'Waiting',
  attempts integer NOT NULL DEFAULT 0,
  result text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_content TO authenticated;
GRANT ALL ON public.scheduled_content TO service_role;
ALTER TABLE public.scheduled_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY scheduled_content_select ON public.scheduled_content FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY scheduled_content_write ON public.scheduled_content FOR ALL TO authenticated USING (private.is_org_member(organization_id, auth.uid())) WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE INDEX IF NOT EXISTS scheduled_content_org_idx ON public.scheduled_content(organization_id);
CREATE TRIGGER set_scheduled_content_updated_at BEFORE UPDATE ON public.scheduled_content FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 12. META LEADS
CREATE TABLE IF NOT EXISTS public.meta_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ad_name text NOT NULL DEFAULT '',
  ad_set_name text NOT NULL DEFAULT '',
  lead_form text NOT NULL DEFAULT '',
  assigned_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  crm_status text NOT NULL DEFAULT 'New',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_leads TO authenticated;
GRANT ALL ON public.meta_leads TO service_role;
ALTER TABLE public.meta_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY meta_leads_select ON public.meta_leads FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY meta_leads_write ON public.meta_leads FOR ALL TO authenticated USING (private.is_org_member(organization_id, auth.uid())) WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE INDEX IF NOT EXISTS meta_leads_org_idx ON public.meta_leads(organization_id);
CREATE TRIGGER set_meta_leads_updated_at BEFORE UPDATE ON public.meta_leads FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 13. MARKETING CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.marketing_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'WhatsApp',
  contact_name text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  last_message text NOT NULL DEFAULT '',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread integer NOT NULL DEFAULT 0,
  assigned_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_conversations TO authenticated;
GRANT ALL ON public.marketing_conversations TO service_role;
ALTER TABLE public.marketing_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY mkt_conversations_select ON public.marketing_conversations FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY mkt_conversations_write ON public.marketing_conversations FOR ALL TO authenticated USING (private.is_org_member(organization_id, auth.uid())) WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE INDEX IF NOT EXISTS mkt_conversations_org_idx ON public.marketing_conversations(organization_id);
CREATE TRIGGER set_mkt_conversations_updated_at BEFORE UPDATE ON public.marketing_conversations FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 14. MARKETING CONVERSATION MESSAGES
CREATE TABLE IF NOT EXISTS public.marketing_conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.marketing_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'in',
  body text NOT NULL DEFAULT '',
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_conversation_messages TO authenticated;
GRANT ALL ON public.marketing_conversation_messages TO service_role;
ALTER TABLE public.marketing_conversation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY mkt_conv_msgs_select ON public.marketing_conversation_messages FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY mkt_conv_msgs_write ON public.marketing_conversation_messages FOR ALL TO authenticated USING (private.is_org_member(organization_id, auth.uid())) WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE INDEX IF NOT EXISTS mkt_conv_msgs_conv_idx ON public.marketing_conversation_messages(conversation_id);
CREATE TRIGGER set_mkt_conv_msgs_updated_at BEFORE UPDATE ON public.marketing_conversation_messages FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 15. AUTOMATION WORKFLOWS
CREATE TABLE IF NOT EXISTS public.automation_workflows (
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
CREATE INDEX IF NOT EXISTS automation_workflows_org_idx ON public.automation_workflows(organization_id);
CREATE TRIGGER set_automation_workflows_updated_at BEFORE UPDATE ON public.automation_workflows FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 16. EXECUTION LOGS
CREATE TABLE IF NOT EXISTS public.execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'Success',
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
CREATE INDEX IF NOT EXISTS execution_logs_org_idx ON public.execution_logs(organization_id);
CREATE INDEX IF NOT EXISTS execution_logs_workflow_idx ON public.execution_logs(workflow_id);
CREATE TRIGGER set_execution_logs_updated_at BEFORE UPDATE ON public.execution_logs FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 17. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL DEFAULT '',
  entity_type text NOT NULL DEFAULT '',
  entity_label text NOT NULL DEFAULT '',
  old_value text NOT NULL DEFAULT '',
  new_value text NOT NULL DEFAULT '',
  ip text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Success',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT TO authenticated USING (private.is_org_admin(organization_id, auth.uid()));
CREATE POLICY audit_logs_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE INDEX IF NOT EXISTS audit_logs_org_idx ON public.audit_logs(organization_id);
CREATE TRIGGER set_audit_logs_updated_at BEFORE UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 18. ACTIVITIES
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL DEFAULT '',
  entity_id uuid,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY activities_select ON public.activities FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY activities_insert ON public.activities FOR INSERT TO authenticated WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE INDEX IF NOT EXISTS activities_org_idx ON public.activities(organization_id);
CREATE INDEX IF NOT EXISTS activities_entity_idx ON public.activities(entity_id);
CREATE TRIGGER set_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 19. FILES
CREATE TABLE IF NOT EXISTS public.files (
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
CREATE INDEX IF NOT EXISTS files_org_idx ON public.files(organization_id);
CREATE TRIGGER set_files_updated_at BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 20. MILESTONES
CREATE TABLE IF NOT EXISTS public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  due_date date,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  progress integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Upcoming',
  deliverables text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestones TO authenticated;
GRANT ALL ON public.milestones TO service_role;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY milestones_select ON public.milestones FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY milestones_write ON public.milestones FOR ALL TO authenticated USING (private.is_org_member(organization_id, auth.uid())) WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE INDEX IF NOT EXISTS milestones_project_idx ON public.milestones(project_id);
CREATE TRIGGER set_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 21. PROJECT TEMPLATES
CREATE TABLE IF NOT EXISTS public.project_templates (
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
CREATE INDEX IF NOT EXISTS project_templates_org_idx ON public.project_templates(organization_id);
CREATE TRIGGER set_project_templates_updated_at BEFORE UPDATE ON public.project_templates FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 22. CONTACTS
CREATE TABLE IF NOT EXISTS public.contacts (
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
CREATE INDEX IF NOT EXISTS contacts_client_idx ON public.contacts(client_id);
CREATE TRIGGER set_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- 23. COMMENTS
CREATE TABLE IF NOT EXISTS public.comments (
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
CREATE INDEX IF NOT EXISTS comments_entity_idx ON public.comments(entity_id);
CREATE INDEX IF NOT EXISTS comments_org_idx ON public.comments(organization_id);
CREATE TRIGGER set_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();
