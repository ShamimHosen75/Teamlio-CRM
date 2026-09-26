import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Building2, Globe, Mail, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/badges";
import { EmptyState, SkeletonGrid } from "@/components/shared/states";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { NewCompanyDrawer } from "@/components/crm/new-company-drawer";
import { useClients, useContacts, useProjects } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/crm/companies")({
  validateSearch: (search: Record<string, unknown>) => ({
    create: search.create === "true" || search.create === true,
    new: search.new === "true" || search.new === true,
  }),
  head: () => ({
    meta: [
      { title: "Companies — Teamlio" },
      { name: "description", content: "Company accounts with industry, contacts and engagement volume." },
      { property: "og:title", content: "Companies — Teamlio" },
      { property: "og:description", content: "Company accounts and their engagement volume." },
    ],
  }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const search = Route.useSearch();
  const [drawerOpen, setDrawerOpen] = useState(Boolean(search.create || search.new));
  const { data: clients = [], isLoading } = useClients();
  const { data: contacts = [] } = useContacts();
  const { data: projects = [] } = useProjects();

  useEffect(() => {
    if (search.create || search.new) {
      setDrawerOpen(true);
    }
  }, [search.create, search.new]);

  return (
    <PermissionGuard permission="client.read" mode="page">
      <div className="mx-auto max-w-[1600px]">
        <PageHeader
          title="Companies"
          description="The organisations behind your client accounts."
          actions={
            <NewCompanyDrawer
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              trigger={
                <Button size="sm" className="gap-1.5 shadow-sm">
                  <Plus className="size-4" />
                  <span>New Company</span>
                </Button>
              }
            />
          }
        />
        {isLoading ? (
          <SkeletonGrid />
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No companies yet"
            description="Add your first company account to start tracking clients, contacts, and projects."
            action={
              <Button size="sm" onClick={() => setDrawerOpen(true)} className="gap-1.5">
                <Plus className="size-4" />
                <span>Add First Company</span>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {clients.map((c) => (
              <Link key={c.id} to="/crm/clients" className="surface-card p-4 hover:shadow-raised">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Building2 className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{c.company}</p>
                      <p className="text-xs text-muted-foreground">{c.industry}</p>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5"><Mail className="size-3.5" /> {c.email || "No email"}</p>
                  <p className="flex items-center gap-1.5"><Globe className="size-3.5" /> {c.website || "No website"}</p>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {projects.filter((p) => p.client_id === c.id).length} projects · {contacts.filter((ct) => ct.client_id === c.id).length} contacts
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
