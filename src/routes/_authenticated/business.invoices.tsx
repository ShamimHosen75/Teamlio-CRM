import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Mail, Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState, SkeletonTable } from "@/components/shared/states";
import { FormDrawer } from "@/components/shared/form-drawer";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LivePage, TextField, useLiveOrgContext } from "@/components/cloud/crm-ui";
import { prettyStatus } from "@/components/cloud/work-ui";
import { fmtDate, money } from "@/lib/format";
import { useOrgProjects, type CloudProject } from "@/hooks/use-cloud";
import { useOrgClients, type CloudClient } from "@/hooks/use-crm-cloud";
import { useWorkspaceIntegrations } from "@/lib/integrations/use-integrations";
import {
  INVOICE_STATUSES,
  invoicePaid,
  invoiceSubtotal,
  invoiceTotal,
  nextInvoiceNumber,
  useCreateInvoice,
  useDeleteInvoice,
  useOrgInvoiceItems,
  useOrgInvoices,
  useOrgPayments,
  useUpdateInvoice,
  type CloudInvoice,
  type InvoiceDraftItem,
  type InvoiceStatus,
} from "@/hooks/use-billing-cloud";

export const Route = createFileRoute("/_authenticated/business/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — Project CRM" },
      { name: "description", content: "Generate real invoices, track what is paid and what is still outstanding." },
      { property: "og:title", content: "Invoices — Project CRM" },
      { property: "og:description", content: "Live invoices with line items, totals and payment status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { activeOrgId, canManage } = useLiveOrgContext();
  const { integrations } = useWorkspaceIntegrations();
  const stripeState = integrations.stripe;
  const { data: invoices = [], isLoading } = useOrgInvoices(activeOrgId);
  const { data: items = [] } = useOrgInvoiceItems(activeOrgId);
  const { data: payments = [] } = useOrgPayments(activeOrgId);
  const { data: clients = [] } = useOrgClients(activeOrgId);
  const { data: projects = [] } = useOrgProjects(activeOrgId);
  const update = useUpdateInvoice();
  const remove = useDeleteInvoice();
  const [status, setStatus] = useState("all");

  const rows = invoices.filter((i) => status === "all" || i.status === status);
  const billed = invoices.reduce((sum, invoice) => sum + invoiceTotal(invoice, items), 0);
  const collected = invoices.reduce((sum, invoice) => sum + invoicePaid(invoice, payments), 0);

  return (
    <LivePage
      title="Invoices"
      description="Invoices you generate here are stored live and update as payments arrive."
      actions={
        <div className="flex items-center gap-2">
          {stripeState?.connected ? (
            <Badge
              variant="outline"
              className="gap-1.5 py-1 px-2.5 bg-violet-500/10 text-violet-400 border-violet-500/30 text-xs font-medium"
            >
              <CreditCard className="size-3.5" />
              <span>Payments: {stripeState.config.provider?.toUpperCase()} ({stripeState.config.mode === "live" ? "Live" : "Test"})</span>
            </Badge>
          ) : null}
          {canManage ? (
            <NewInvoiceDrawer
              organizationId={activeOrgId}
              clients={clients}
              projects={projects}
              suggestedNumber={nextInvoiceNumber(invoices)}
            />
          ) : null}
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Invoices" value={invoices.length} icon={Receipt} loading={isLoading} />
          <StatCard label="Total billed" value={money(billed)} icon={Receipt} loading={isLoading} />
          <StatCard label="Collected" value={money(collected)} icon={Receipt} tone="success" loading={isLoading} />
          <StatCard label="Outstanding" value={money(Math.max(0, billed - collected))} icon={Receipt} tone="warning" loading={isLoading} />
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filter invoices by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {INVOICE_STATUSES.map((s) => <SelectItem key={s} value={s}>{prettyStatus(s)}</SelectItem>)}
          </SelectContent>
        </Select>

        {isLoading ? (
          <SkeletonTable />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={invoices.length ? "No invoices with this status" : "No invoices yet"}
            description={invoices.length ? "Try another status filter." : "Generate your first invoice for a client."}
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {rows.map((invoice) => {
              const lines = items.filter((i) => i.invoice_id === invoice.id);
              const total = invoiceTotal(invoice, items);
              const paid = invoicePaid(invoice, payments);
              return (
                <article key={invoice.id} className="surface-card min-w-0 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {clients.find((c) => c.id === invoice.client_id)?.company ?? "No client"}
                      </p>
                      <h3 className="truncate text-base font-semibold">{invoice.invoice_number}</h3>
                      <p className="text-xs text-muted-foreground">
                        Issued {fmtDate(invoice.issue_date)} · Due {fmtDate(invoice.due_date)}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">{prettyStatus(invoice.status)}</Badge>
                  </div>

                  <ul className="mt-4 space-y-1 border-t pt-3 text-xs">
                    {lines.length ? (
                      lines.map((line) => (
                        <li key={line.id} className="flex items-center justify-between gap-3">
                          <span className="truncate text-muted-foreground">
                            {line.description} × {Number(line.quantity)}
                          </span>
                          <span>{money(Number(line.quantity) * Number(line.unit_price), invoice.currency)}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">No line items.</li>
                    )}
                  </ul>

                  <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                    <Row label="Subtotal" value={money(invoiceSubtotal(lines), invoice.currency)} />
                    <Row label={`Tax (${Number(invoice.tax_rate)}%)`} value={money(total - invoiceSubtotal(lines), invoice.currency)} />
                    <Row label="Total" value={money(total, invoice.currency)} strong />
                    <Row label="Paid" value={money(paid, invoice.currency)} />
                    <Row label="Balance" value={money(Math.max(0, total - paid), invoice.currency)} strong />
                  </div>

                   <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap">
                    <Select
                      value={invoice.status}
                      disabled={!canManage}
                      onValueChange={(value) => update.mutate({ id: invoice.id, status: value as InvoiceStatus })}
                    >
                       <SelectTrigger className="h-9 w-full sm:w-[170px]" aria-label={`${invoice.invoice_number} status`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INVOICE_STATUSES.map((s) => <SelectItem key={s} value={s}>{prettyStatus(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {canManage ? (
                      <>
                         <Button className="col-span-2 w-full sm:col-span-1 sm:w-auto"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            update.mutate(
                              { id: invoice.id, status: "sent", last_emailed_at: new Date().toISOString() },
                              {
                                onSuccess: () =>
                                  toast.success("Send recorded", {
                                    description: "Emailing is a placeholder — connect an email service to deliver it for real.",
                                  }),
                              },
                            )
                          }
                        >
                          <Mail className="size-4" /> Record send
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button size="icon" variant="ghost" aria-label={`Delete ${invoice.invoice_number}`}>
                              <Trash2 className="size-4" />
                            </Button>
                          }
                          title="Delete invoice?"
                          description="The invoice and its line items are removed permanently."
                          confirmLabel="Delete"
                          destructive
                          onConfirm={() => remove.mutate(invoice.id, { onSuccess: () => toast.success("Invoice deleted") })}
                        />
                      </>
                    ) : null}
                  </div>
                  {invoice.last_emailed_at ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">Last send recorded {fmtDate(invoice.last_emailed_at)}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </LivePage>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

const emptyItem: InvoiceDraftItem = { description: "", quantity: 1, unit_price: 0 };

function NewInvoiceDrawer({
  organizationId,
  clients,
  projects,
  suggestedNumber,
}: {
  organizationId: string | undefined;
  clients: CloudClient[];
  projects: CloudProject[];
  suggestedNumber: string;
}) {
  const create = useCreateInvoice(organizationId);
  const [number, setNumber] = useState(suggestedNumber);
  const [clientId, setClientId] = useState("none");
  const [projectId, setProjectId] = useState("none");
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceDraftItem[]>([{ ...emptyItem }]);

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const total = subtotal + (subtotal * (Number(taxRate) || 0)) / 100;

  const patchItem = (index: number, patch: Partial<InvoiceDraftItem>) =>
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <FormDrawer
      trigger={<Button size="sm" disabled={!organizationId}><Plus className="size-4" /> Generate invoice</Button>}
      title="Generate invoice"
      description="Add line items and the totals are calculated for you."
      submitLabel="Create invoice"
      onSubmit={async () => {
        if (!number.trim() || !items.some((item) => item.description.trim())) {
          toast.error("An invoice number and at least one line item are required");
          return false;
        }
        try {
          await create.mutateAsync({
            invoice_number: number.trim(),
            client_id: clientId === "none" ? null : clientId,
            project_id: projectId === "none" ? null : projectId,
            status,
            issue_date: issueDate,
            due_date: dueDate || null,
            currency: currency.trim().toUpperCase() || "USD",
            tax_rate: Number(taxRate) || 0,
            notes: notes.trim(),
            items,
          });
          toast.success("Invoice created");
          setNumber(nextInvoiceNumber([{ invoice_number: number } as CloudInvoice]));
          setItems([{ ...emptyItem }]);
          setNotes("");
          return true;
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not create invoice");
          return false;
        }
      }}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Invoice number" value={number} onChange={setNumber} />
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger aria-label="Invoice client"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger aria-label="Invoice project"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
              <SelectTrigger aria-label="Invoice status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVOICE_STATUSES.map((s) => <SelectItem key={s} value={s}>{prettyStatus(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <TextField label="Issue date" type="date" value={issueDate} onChange={setIssueDate} />
          <TextField label="Due date" type="date" value={dueDate} onChange={setDueDate} />
          <TextField label="Currency" value={currency} onChange={setCurrency} />
          <TextField label="Tax rate %" type="number" value={taxRate} onChange={setTaxRate} />
        </div>

        <div className="space-y-2">
          <Label>Line items</Label>
          {items.map((item, index) => (
             <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 sm:grid-cols-[1fr_90px_120px_auto]">
               <div className="col-span-3 sm:col-span-1"><TextField label={`Description ${index + 1}`} value={item.description} onChange={(v) => patchItem(index, { description: v })} /></div>
              <TextField label={`Qty ${index + 1}`} type="number" value={String(item.quantity)} onChange={(v) => patchItem(index, { quantity: Number(v) || 0 })} />
              <TextField label={`Price ${index + 1}`} type="number" value={String(item.unit_price)} onChange={(v) => patchItem(index, { unit_price: Number(v) || 0 })} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="self-end"
                aria-label={`Remove line ${index + 1}`}
                onClick={() => setItems(items.length > 1 ? items.filter((_, i) => i !== index) : [{ ...emptyItem }])}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { ...emptyItem }])}>
            <Plus className="size-4" /> Add line
          </Button>
        </div>

        <div className="rounded-lg border p-3 text-sm">
          <Row label="Subtotal" value={money(subtotal, currency || "USD")} />
          <Row label="Total with tax" value={money(total, currency || "USD")} strong />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invoice-notes">Notes</Label>
          <Textarea id="invoice-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">
          Emailing invoices is a placeholder for now — you can record when an invoice was sent.
        </p>
      </div>
    </FormDrawer>
  );
}
