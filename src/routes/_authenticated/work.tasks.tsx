import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, CheckSquare2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CreateTaskDrawer,
  LiveTaskRow,
  OrgSwitcher,
  prettyStatus,
} from "@/components/cloud/work-ui";
import { useActiveOrg } from "@/hooks/use-active-org";
import {
  TASK_STATUSES,
  WORK_PRIORITIES,
  useOrgMembers,
  useOrgProjects,
  useOrgTasks,
  useSession,
} from "@/hooks/use-cloud";

export const Route = createFileRoute("/_authenticated/work/tasks")({
  head: () => ({
    meta: [
      { title: "Live Tasks — Project CRM" },
      { name: "description", content: "Every real task in your workspace with owners, categories and workflow statuses." },
      { property: "og:title", content: "Live Tasks — Project CRM" },
      { property: "og:description", content: "Update real task statuses and assignees in one list." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveTasksPage,
});

function LiveTasksPage() {
  const { user } = useSession();
  const { orgs, activeOrg, activeOrgId, setOrgId, isLoading } = useActiveOrg();
  const { data: members = [] } = useOrgMembers(activeOrgId);
  const { data: projects = [] } = useOrgProjects(activeOrgId);
  const { data: tasks = [], isLoading: tasksLoading } = useOrgTasks(activeOrgId);

  const [projectId, setProjectId] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [mine, setMine] = useState(false);
  const [query, setQuery] = useState("");

  const myRole = useMemo(() => members.find((m) => m.user_id === user?.id)?.role, [members, user]);
  const canManage = activeOrg?.owner_id === user?.id || ["owner", "admin", "manager", "member"].includes(myRole || "") || (!myRole && !!user);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "Project";
  const rows = tasks.filter(
    (t) =>
      (projectId === "all" || t.project_id === projectId) &&
      (status === "all" || t.status === status) &&
      (priority === "all" || t.priority === priority) &&
      (!mine || t.assignee_id === user?.id) &&
      (query.trim() === "" ||
        `${t.title} ${projectName(t.project_id)}`.toLowerCase().includes(query.trim().toLowerCase())),
  );

  const openCount = tasks.filter((t) => t.status !== "completed").length;
  const myCount = tasks.filter((t) => t.assignee_id === user?.id).length;

  return (
    <>
      <PageHeader
        title="Live tasks"
        description="One list of every real task in this organization, with inline status and owner updates."
        actions={
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center">
            <OrgSwitcher orgs={orgs} value={activeOrgId} onChange={setOrgId} />
            {canManage ? <CreateTaskDrawer organizationId={activeOrgId} members={members} projects={projects} /> : null}
          </div>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      ) : !activeOrg ? (
        <EmptyState
          icon={Building2}
          title="No organization yet"
          description="Create your first organization in Workspace Admin to start adding real tasks."
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Tasks" value={tasks.length} icon={CheckSquare2} loading={tasksLoading} hint={activeOrg.name} />
            <StatCard label="Open" value={openCount} icon={CheckSquare2} loading={tasksLoading} />
            <StatCard label="Assigned to you" value={myCount} icon={CheckSquare2} loading={tasksLoading} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks or projects…"
              aria-label="Search tasks"
              className="h-9 w-full sm:w-[240px]"
            />
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filter by project"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-[170px]" aria-label="Filter by status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{prettyStatus(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-full sm:w-[170px]" aria-label="Filter by priority"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {WORK_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{prettyStatus(p)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full sm:w-auto" variant={mine ? "secondary" : "ghost"} size="sm" onClick={() => setMine((v) => !v)}>
              Assigned to me
            </Button>
            <Button asChild className="w-full sm:w-auto" variant="ghost" size="sm">
              <Link to="/work/projects">View projects</Link>
            </Button>
          </div>

          <div className="surface-card overflow-hidden">
            <div className="border-b px-5 py-3">
              <h2 className="text-sm font-semibold">{rows.length} tasks</h2>
            </div>
            <div className="hidden border-b bg-muted/40 px-5 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1fr_120px_150px_170px] sm:gap-2">
              <span>Task &amp; project</span>
              <span>Due date</span>
              <span>Status</span>
              <span>Assignee</span>
            </div>
            {tasksLoading ? (
              <p className="px-5 py-8 text-sm text-muted-foreground">Loading tasks…</p>
            ) : rows.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                {tasks.length ? "No tasks match these filters." : "No tasks yet — create one to get started."}
              </p>
            ) : (
              <ul className="divide-y px-4 sm:px-5">
                {rows.map((task) => (
                  <LiveTaskRow key={task.id} task={task} projectName={projectName(task.project_id)} members={members} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
