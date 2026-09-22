-- Migration: marketing tables
-- campaigns, content_items, scheduled_content, meta_leads, conversations, conversation_messages

CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  client_id uuid REFERENCES public.crm_clients(id) ON DELETE SET NULL,
  objective text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Active', 'Paused', 'Completed', 'Draft')),
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
CREATE INDEX campaigns_org_idx ON public.campaigns(organization_id);
CREATE TRIGGER set_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- Content items
CREATE TABLE public.content_items (
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
CREATE INDEX content_items_org_idx ON public.content_items(organization_id);
CREATE TRIGGER set_content_items_updated_at BEFORE UPDATE ON public.content_items FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- Scheduled content
CREATE TABLE public.scheduled_content (
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
CREATE INDEX scheduled_content_org_idx ON public.scheduled_content(organization_id);
CREATE TRIGGER set_scheduled_content_updated_at BEFORE UPDATE ON public.scheduled_content FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- Meta leads (Facebook/Instagram leads)
CREATE TABLE public.meta_leads (
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
  crm_status text NOT NULL DEFAULT 'New' CHECK (crm_status IN ('New', 'Assigned', 'Converted', 'Rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_leads TO authenticated;
GRANT ALL ON public.meta_leads TO service_role;
ALTER TABLE public.meta_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY meta_leads_select ON public.meta_leads FOR SELECT TO authenticated USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY meta_leads_write ON public.meta_leads FOR ALL TO authenticated USING (private.is_org_member(organization_id, auth.uid())) WITH CHECK (private.is_org_member(organization_id, auth.uid()));
CREATE INDEX meta_leads_org_idx ON public.meta_leads(organization_id);
CREATE TRIGGER set_meta_leads_updated_at BEFORE UPDATE ON public.meta_leads FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- Marketing conversations (WhatsApp, Instagram DM, Facebook Messenger)
CREATE TABLE public.marketing_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'WhatsApp' CHECK (channel IN ('WhatsApp', 'Instagram', 'Facebook')),
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
CREATE INDEX mkt_conversations_org_idx ON public.marketing_conversations(organization_id);
CREATE TRIGGER set_mkt_conversations_updated_at BEFORE UPDATE ON public.marketing_conversations FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();

-- Marketing conversation messages
CREATE TABLE public.marketing_conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.marketing_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'in' CHECK (direction IN ('in', 'out')),
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
CREATE INDEX mkt_conv_msgs_conv_idx ON public.marketing_conversation_messages(conversation_id);
CREATE TRIGGER set_mkt_conv_msgs_updated_at BEFORE UPDATE ON public.marketing_conversation_messages FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();
