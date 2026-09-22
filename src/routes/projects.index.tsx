import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutGrid, Plus, Rows3 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { FormDrawer } from "@/components/shared/form-drawer";
import { CreatableCombobox } from "@/components/shared/creatable-combobox";
import { PriorityBadge, StatusBadge } from "@/components/shared/badges";
import { UserAvatarGroup, UserCell } from "@/components/shared/user-avatar";
import { SkeletonGrid } from "@/components/shared/states";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRIORITIES, PROJECT_STATUSES } from "@/lib/constants";
import { fmtDate, money, percent } from "@/lib/format";
import { useClients, useCreateProject, useProjects, useUsers } from "@/hooks/use-data";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — Teamlio" },
      { name: "description", content: "Track every client project, status, budget and delivery health." },
      { property: "og:title", content: "Projects — Teamlio" },
      { property: "og:description", content: "Every client project with status, budget and health." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: clients = [] } = useClients();
  const [view, setView] = useState<"grid" | "table">("grid");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const navigate = useNavigate();

  const clientName = (project: Project) => project.client_name || clients.find((c) => c.id === project.client_id)?.company || "—";
  const rows = projects.filter(
    (p) => (status === "all" || p.status === status) && (priority === "all" || p.priority === priority),
  );

  const columns: Column<Project>[] = [
    {
      key: "name",
      header: "Project",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="min-w-0">
          <Link to="/projects/$projectId" params={{ projectId: r.id }} className="font-medium hover:text-primary">
            {r.name}
          </Link>
          <p className="text-xs text-muted-foreground">{r.code}</p>
        </div>
      ),
    },
    { key: "client", header: "Client", hideBelow: "lg", render: (r) => clientName(r) },
    {
      key: "manager",
      header: "Manager",
      hideBelow: "xl",
      render: (r) => r.manager_name || !r.manager_user_id ? r.manager_name || "Unassigned" : <UserCell userId={r.manager_user_id} />,
    },
    { key: "status", header: "Status", sortable: true, sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    { key: "priority", header: "Priority", hideBelow: "sm", render: (r) => <PriorityBadge priority={r.priority} /> },
    {
      key: "progress",
      header: "Progress",
      sortable: true,
      sortValue: (r) => r.progress,
      hideBelow: "md",
      render: (r) => (
        <div className="flex w-32 items-center gap-2">
          <Progress value={r.progress} className="h-1.5" />
          <span className="text-xs text-muted-foreground">{percent(r.progress)}</span>
        </div>
      ),
    },
    { key: "due", header: "Due", sortable: true, sortValue: (r) => r.due_date, hideBelow: "md", render: (r) => fmtDate(r.due_date) },
    { key: "budget", header: "Budget", hideBelow: "xl", render: (r) => money(r.budget) },
  ];

  return (
    <PermissionGuard permission="project.read" mode="page">
      <div className="mx-auto max-w-[1600px]">
        <PageHeader
          title="Projects"
          description={`${projects.length} projects across all clients and teams.`}
          actions={
            <>
              <div className="flex rounded-lg border p-0.5">
                <Button variant={view === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setView("grid")}>
                  <LayoutGrid className="size-4" />
                </Button>
                <Button variant={view === "table" ? "secondary" : "ghost"} size="sm" onClick={() => setView("table")}>
                  <Rows3 className="size-4" />
                </Button>
              </div>
              <PermissionGuard permission="project.create">
                <NewProjectDrawer />
              </PermissionGuard>
            </>
          }
        />

        <div className="mb-4">
          <FilterBar
            filters={[
              { key: "status", label: "Status", options: PROJECT_STATUSES, value: status, onChange: setStatus },
              { key: "priority", label: "Priority", options: PRIORITIES, value: priority, onChange: setPriority },
            ]}
          />
        </div>

        {view === "table" ? (
          <DataTable
            data={rows}
            columns={columns}
            loading={isLoading}
            searchKeys={["name", "code"]}
            searchPlaceholder="Search projects…"
            onRowClick={(r) => navigate({ to: "/projects/$projectId", params: { projectId: r.id } })}
            emptyTitle="No projects match these filters"
            mobileCard={(r) => (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{clientName(r)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <Progress value={r.progress} className="h-1.5" />
                <p className="text-xs text-muted-foreground">Due {fmtDate(r.due_date)}</p>
              </div>
            )}
          />
        ) : isLoading ? (
          <SkeletonGrid />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((p) => (
              <ProjectCard key={p.id} project={p} clientName={clientName(p)} />
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

export function ProjectCard({ project, clientName }: { project: Project; clientName: string }) {
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="surface-card block p-4 transition-shadow hover:shadow-raised"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{project.code}</p>
          <h3 className="truncate text-sm font-semibold">{project.name}</h3>
          <p className="truncate text-xs text-muted-foreground">{clientName}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>
      <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{project.description}</p>
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{percent(project.progress)}</span>
        </div>
        <Progress value={project.progress} className="h-1.5" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <PriorityBadge priority={project.priority} />
          <span>Due {fmtDate(project.due_date)}</span>
        </div>
        {project.manager_name || !project.manager_user_id ? (
          <span className="max-w-28 truncate text-xs text-muted-foreground">{project.manager_name || "Unassigned"}</span>
        ) : (
          <UserAvatarGroup userIds={[project.manager_user_id]} />
        )}
      </div>
      <p
        className={cn(
          "mt-3 text-xs font-medium",
          project.health === "On Track" ? "text-success" : project.health === "At Risk" ? "text-warning-foreground" : "text-destructive",
        )}
      >
        {project.health} · {money(project.spent)} of {money(project.budget)} spent
      </p>
    </Link>
  );
}

function NewProjectDrawer() {
  const create = useCreateProject();
  const { data: clients = [] } = useClients();
  const { data: users = [] } = useUsers();
  const [form, setForm] = useState({
    name: "",
    description: "",
    client_id: "",
    client_name: "",
    manager_user_id: "",
    manager_name: "",
    priority: "Medium",
    due_date: "",
  });
  const [error, setError] = useState("");

  return (
    <FormDrawer
      trigger={
        <Button size="sm">
          <Plus className="size-4" /> New project
        </Button>
      }
      title="Create project"
      description="Projects group tasks, milestones, files and billing for a client."
      submitLabel="Create project"
      onSubmit={() => {
        if (!form.name.trim()) {
          setError("Project name is required.");
          return false;
        }
        const clientTrimmed = form.client_name.trim();
        const selectedClient = clientTrimmed
          ? clients.find((client) => client.company.toLowerCase() === clientTrimmed.toLowerCase())
          : undefined;
        const managerTrimmed = form.manager_name.trim();
        const selectedManager = managerTrimmed
          ? users.find((user) => user.full_name.toLowerCase() === managerTrimmed.toLowerCase())
          : undefined;
        create.mutate(
          {
            name: form.name.trim(),
            description: form.description.trim(),
            client_id: selectedClient?.id || undefined,
            client_name: clientTrimmed || "Internal",
            manager_user_id: selectedManager?.id || undefined,
            manager_name: managerTrimmed || undefined,
            priority: form.priority as Project["priority"],
            due_date: form.due_date || undefined,
          },
          {
            onSuccess: () => {
              toast.success(`${form.name} created`);
              setForm({ name: "", description: "", client_id: "", client_name: "", manager_user_id: "", manager_name: "", priority: "Medium", due_date: "" });
              setError("");
            },
            onError: (err) => {
              toast.error(err instanceof Error ? err.message : "Failed to create project");
            },
          },
        );
        return true;
      }}
    >
      <div className="space-y-4">
        {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        <div className="space-y-1.5">
          <Label htmlFor="p-name">Project name</Label>
          <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Corporate Website Revamp" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-desc">Description</Label>
          <Textarea id="p-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Client</Label>
            <CreatableCombobox
              value={form.client_name}
              onChange={(clientName) => setForm({ ...form, client_name: clientName })}
              options={clients.map((client) => client.company)}
              placeholder="Select or add client"
              searchPlaceholder="Search or type a client name…"
              emptyLabel="Start typing to add a client name."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Project manager</Label>
            <CreatableCombobox
              value={form.manager_name}
              onChange={(managerName) => setForm({ ...form, manager_name: managerName })}
              options={users.map((user) => user.full_name)}
              placeholder="Select or add manager"
              searchPlaceholder="Search or type a manager name…"
              emptyLabel="Start typing to add a manager name."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-due">Due date</Label>
            <Input id="p-due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
        </div>
      </div>
    </FormDrawer>
  );
}
