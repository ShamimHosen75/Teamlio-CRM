import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { PriorityBadge, StatusBadge } from "@/components/shared/badges";
import { UserAvatarGroup, UserCell, userName } from "@/components/shared/user-avatar";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { EmptyState, SkeletonCard } from "@/components/shared/states";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TimelineView } from "@/components/tasks/timeline-view";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtDate, money, percent } from "@/lib/format";
import {
  useActivities,
  useClients,
  useCreateTask,
  useExpenses,
  useFiles,
  useInvoices,
  useMilestones,
  useProject,
  useTasks,
  useUpdateProject,
  useUpdateTask,
  useUsers,
} from "@/hooks/use-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDrawer } from "@/components/shared/form-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Task, TaskStatus } from "@/lib/types";

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Project detail — Teamlio" },
      { name: "description", content: "Overview, tasks, milestones, files and billing for a single project." },
      { property: "og:title", content: "Project detail — Teamlio" },
      { property: "og:description", content: "Tasks, milestones, files and billing in one project view." },
    ],
  }),
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const { data: project, isLoading } = useProject(projectId);
  const { data: tasks = [] } = useTasks(projectId);
  const { data: milestones = [] } = useMilestones(projectId);
  const { data: clients = [] } = useClients();
  const { data: files = [] } = useFiles();
  const { data: invoices = [] } = useInvoices();
  const { data: expenses = [] } = useExpenses();
  const { data: activities = [] } = useActivities();
  const { data: users = [] } = useUsers();
  const update = useUpdateTask();
  const updateProject = useUpdateProject();
  const createTask = useCreateTask();
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [zoom, setZoom] = useState<"Daily" | "Weekly" | "Monthly">("Weekly");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("none");
  const [newTaskDue, setNewTaskDue] = useState("");

  if (isLoading) return <SkeletonCard lines={6} />;
  if (!project) return <EmptyState title="Project not found" description="This project may have been archived." />;

  const client = clients.find((c) => c.id === project.client_id);
  const projectFiles = files.filter((f) => f.project_id === project.id);
  const projectInvoices = invoices.filter((i) => i.project_id === project.id);
  const projectExpenses = expenses.filter((e) => e.project_id === project.id);
  const done = tasks.filter((t) => t.status === "Completed").length;

  return (
    <div className="mx-auto max-w-[1600px]">
      <Link to="/projects" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to projects
      </Link>

      <PageHeader
        title={project.name}
        description={`Created ${fmtDate(project.created_at)} · Priority: ${project.priority} · Health: ${project.health}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={project.priority} />
            <StatusBadge status={project.status} />
          </div>
        }
      />

      <div className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Tasks completed" value={`${done} / ${tasks.length}`} />
        <Metric label="Progress" value={percent(project.progress)} />
        <Metric label="Budget used" value={`${money(project.spent)} / ${money(project.budget)}`} />
        <Metric label="Health" value={project.health} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          {["overview", "tasks", "kanban", "timeline", "milestones", "team", "files", "billing", "activity"].map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="surface-card p-4 lg:col-span-2">
            <h2 className="text-sm font-semibold">About this project</h2>
            <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail label="Client" value={project.client_name || client?.company || "—"} />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Assign Project Manager</p>
                <Select
                  value={project.manager_user_id || "none"}
                  onValueChange={(val) => {
                    const manager = users.find((u) => u.id === val);
                    updateProject.mutate(
                      {
                        id: project.id,
                        input: {
                          manager_user_id: val === "none" ? undefined : val,
                          manager_name: manager?.full_name || undefined,
                        },
                      },
                      {
                        onSuccess: () => toast.success("Project manager assigned"),
                        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to assign manager"),
                      },
                    );
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name} ({u.job_title || "Member"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Detail label="Start date" value={fmtDate(project.start_date)} />
              <Detail label="Due date" value={fmtDate(project.due_date)} />
            </dl>
          </div>
          <div className="surface-card p-4">
            <h2 className="text-sm font-semibold">Upcoming milestones</h2>
            <ul className="mt-3 divide-y">
              {milestones.slice(0, 4).map((m) => (
                <li key={m.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">Due {fmtDate(m.due_date)}</p>
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{tasks.length} tasks in this project</p>
            <FormDrawer
              trigger={
                <Button size="sm">
                  <Plus className="size-4" /> Add task
                </Button>
              }
              title="Add task to project"
              description={`Create a new task under ${project.name}`}
              submitLabel="Create task"
              onSubmit={() => {
                if (!newTaskTitle.trim()) {
                  toast.error("Task title is required");
                  return false;
                }
                createTask.mutate(
                  {
                    project_id: project.id,
                    title: newTaskTitle.trim(),
                    description: newTaskDesc.trim(),
                    assignee_ids: newTaskAssignee !== "none" ? [newTaskAssignee] : [],
                    due_date: newTaskDue || undefined,
                    priority: "Medium",
                    status: "To Do",
                  },
                  {
                    onSuccess: () => {
                      toast.success("Task added to project");
                      setNewTaskTitle("");
                      setNewTaskDesc("");
                      setNewTaskAssignee("none");
                      setNewTaskDue("");
                    },
                    onError: (err) => {
                      toast.error(err instanceof Error ? err.message : "Failed to create task");
                    },
                  },
                );
                return true;
              }}
            >
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Task title</Label>
                  <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="e.g. Design header" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} rows={3} />
                </div>
                <div className="space-y-1.5">
                  <Label>Assignee</Label>
                  <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Due date</Label>
                  <Input type="date" value={newTaskDue} onChange={(e) => setNewTaskDue(e.target.value)} />
                </div>
              </div>
            </FormDrawer>
          </div>

          <div className="surface-card divide-y">
            {tasks.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No tasks yet. Click "Add task" to create the first one.</p>
            ) : (
              tasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setOpenTask(t)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.code} · due {fmtDate(t.due_date)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                    <UserAvatarGroup userIds={t.assignee_ids} max={2} />
                  </div>
                </button>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          <KanbanBoard
            tasks={tasks}
            onOpenTask={setOpenTask}
            onMove={(taskId, status: TaskStatus) => {
              update.mutate({ id: taskId, input: { status } });
              toast.success(`Moved to ${status}`);
            }}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4 space-y-3">
          <Tabs value={zoom} onValueChange={(v) => setZoom(v as typeof zoom)}>
            <TabsList>
              {["Daily", "Weekly", "Monthly"].map((z) => (
                <TabsTrigger key={z} value={z}>{z}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <TimelineView tasks={tasks} milestones={milestones} zoom={zoom} />
        </TabsContent>

        <TabsContent value="milestones" className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {milestones.map((m) => (
            <div key={m.id} className="surface-card p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{m.name}</h3>
                <StatusBadge status={m.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Due {fmtDate(m.due_date)}</p>
              <Progress value={m.progress} className="mt-3 h-1.5" />
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {m.deliverables.map((d) => (
                  <li key={d}>• {d}</li>
                ))}
              </ul>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="team" className="mt-4 surface-card divide-y">
          {Array.from(new Set([project.manager_user_id, ...tasks.flatMap((t) => t.assignee_ids)])).map((uid) => (
            <div key={uid} className="flex items-center justify-between px-4 py-3">
              <UserCell userId={uid} subtitle={uid === project.manager_user_id ? "Project manager" : "Contributor"} />
              <span className="text-xs text-muted-foreground">
                {tasks.filter((t) => t.assignee_ids.includes(uid)).length} tasks
              </span>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          {projectFiles.length === 0 ? (
            <EmptyState title="No files yet" description="Upload deliverables and references for this project." action={<Button size="sm"><Plus className="size-4" /> Upload file</Button>} />
          ) : (
            <div className="surface-card divide-y">
              {projectFiles.map((f) => (
                <div key={f.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.folder} · {f.size_kb} KB · {userName(f.uploader_id)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => toast.success("Download started")}>
                    <Download className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="billing" className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold">Invoices</h3>
            <ul className="mt-3 divide-y text-sm">
              {projectInvoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2.5">
                  <span>{i.number}</span>
                  <div className="flex items-center gap-2">
                    <span>{money(i.items.reduce((s, it) => s + it.quantity * it.rate, 0))}</span>
                    <StatusBadge status={i.status} />
                  </div>
                </li>
              ))}
              {projectInvoices.length === 0 ? <li className="py-4 text-muted-foreground">No invoices raised.</li> : null}
            </ul>
          </div>
          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold">Expenses</h3>
            <ul className="mt-3 divide-y text-sm">
              {projectExpenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2.5">
                  <span>{e.category} · {e.vendor}</span>
                  <div className="flex items-center gap-2">
                    <span>{money(e.amount)}</span>
                    <StatusBadge status={e.status} />
                  </div>
                </li>
              ))}
              {projectExpenses.length === 0 ? <li className="py-4 text-muted-foreground">No expenses logged.</li> : null}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4 surface-card p-4">
          <ActivityTimeline events={activities} limit={12} />
        </TabsContent>
      </Tabs>

      <TaskDetailDrawer task={openTask} open={!!openTask} onOpenChange={(o) => !o && setOpenTask(null)} />
    </div>
  );
}

function Metric({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="surface-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
