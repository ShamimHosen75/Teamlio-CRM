-- Migration: quotations

CREATE TABLE public.quotations (
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
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Accepted', 'Rejected', 'Expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotations_number_unique UNIQUE (organization_id, quote_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotations_select ON public.quotations FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id, auth.uid()));
CREATE POLICY quotations_write ON public.quotations FOR ALL TO authenticated
  USING (private.is_org_member(organization_id, auth.uid()))
  WITH CHECK (private.is_org_member(organization_id, auth.uid()));

CREATE INDEX quotations_org_idx ON public.quotations(organization_id);
CREATE TRIGGER set_quotations_updated_at BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.set_record_updated_at();
