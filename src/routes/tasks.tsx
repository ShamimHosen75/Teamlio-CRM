import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { FormDrawer } from "@/components/shared/form-drawer";
import { PriorityBadge, StatusBadge } from "@/components/shared/badges";
import { UserAvatarGroup, userName } from "@/components/shared/user-avatar";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { useCreateTask, useProjects, useTasks, useUsers } from "@/hooks/use-data";
import type { Task } from "@/lib/types";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Teamlio" },
      { name: "description", content: "One canonical task list with filters, priorities, owners and due dates." },
      { property: "og:title", content: "Tasks — Teamlio" },
      { property: "og:description", content: "Filter, sort and action every task across projects." },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: projects = [] } = useProjects();
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [project, setProject] = useState("all");
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—";
  const rows = tasks.filter(
    (t) =>
      (status === "all" || t.status === status) &&
      (priority === "all" || t.priority === priority) &&
      (project === "all" || projectName(t.project_id) === project),
  );

  const columns: Column<Task>[] = [
    {
      key: "title",
      header: "Task",
      sortable: true,
      sortValue: (r) => r.title,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.title}</p>
          <p className="text-xs text-muted-foreground">{r.code}</p>
        </div>
      ),
    },
    { key: "project", header: "Project", hideBelow: "lg", render: (r) => projectName(r.project_id) },
    { key: "assignees", header: "Assignees", hideBelow: "md", render: (r) => <UserAvatarGroup userIds={r.assignee_ids} max={3} /> },
    { key: "status", header: "Status", sortable: true, sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    { key: "priority", header: "Priority", hideBelow: "sm", sortable: true, sortValue: (r) => r.priority, render: (r) => <PriorityBadge priority={r.priority} /> },
    { key: "due", header: "Due", sortable: true, sortValue: (r) => r.due_date, hideBelow: "md", render: (r) => fmtDate(r.due_date) },
  ];

  return (
    <PermissionGuard permission="task.read" mode="page">
      <div className="mx-auto max-w-[1600px]">
        <PageHeader
          title="Tasks"
          description="A single task model powers this list, the board, the calendar and the timeline."
          actions={
            <PermissionGuard permission="task.create">
              <NewTaskDrawer />
            </PermissionGuard>
          }
        />

        <div className="mb-4">
          <FilterBar
            filters={[
              { key: "status", label: "Status", options: TASK_STATUSES, value: status, onChange: setStatus },
              { key: "priority", label: "Priority", options: PRIORITIES, value: priority, onChange: setPriority },
              { key: "project", label: "Project", options: projects.map((p) => p.name), value: project, onChange: setProject },
            ]}
          />
        </div>

        <DataTable
          data={rows}
          columns={columns}
          loading={isLoading}
          searchKeys={["title", "code"]}
          searchPlaceholder="Search tasks…"
          pageSize={12}
          onRowClick={setOpenTask}
          emptyTitle="No tasks match these filters"
          bulkActions={(selected) => (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toast.success(`${selected.length} tasks marked complete`)}
            >
              Mark complete
            </Button>
          )}
          mobileCard={(r) => (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{r.title}</p>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-xs text-muted-foreground">{projectName(r.project_id)} · due {fmtDate(r.due_date)}</p>
              <div className="flex items-center justify-between">
                <PriorityBadge priority={r.priority} />
                <UserAvatarGroup userIds={r.assignee_ids} max={3} />
              </div>
            </div>
          )}
        />

        <TaskDetailDrawer task={openTask} open={!!openTask} onOpenChange={(o) => !o && setOpenTask(null)} />
      </div>
    </PermissionGuard>
  );
}

function NewTaskDrawer() {
  const create = useCreateTask();
  const { data: projects = [] } = useProjects();
  const { data: users = [] } = useUsers();
  const [form, setForm] = useState({ title: "", description: "", project_id: "", assignee: "", priority: "Medium", due_date: "" });
  const [error, setError] = useState("");

  const effectiveProjectId = form.project_id || projects[0]?.id || "";

  return (
    <FormDrawer
      trigger={
        <Button size="sm">
          <Plus className="size-4" /> New task
        </Button>
      }
      title="Create task"
      description="Tasks appear instantly in list, board, calendar and timeline views."
      submitLabel="Create task"
      onSubmit={() => {
        const targetProjectId = effectiveProjectId;
        if (!form.title.trim() || !targetProjectId) {
          setError(!targetProjectId ? "A project is required. Please create a project first." : "Task title is required.");
          return false;
        }
        create.mutate(
          {
            title: form.title.trim(),
            description: form.description.trim(),
            project_id: targetProjectId,
            assignee_ids: form.assignee ? [form.assignee] : [],
            priority: form.priority as Task["priority"],
            due_date: form.due_date || undefined,
          },
          {
            onSuccess: () => {
              toast.success("Task created");
              setForm({ title: "", description: "", project_id: projects[0]?.id || "", assignee: "", priority: "Medium", due_date: "" });
              setError("");
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
        {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        <div className="space-y-1.5">
          <Label htmlFor="t-title">Title</Label>
          <Input id="t-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-desc">Description</Label>
          <Textarea id="t-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={effectiveProjectId} onValueChange={(v) => setForm({ ...form, project_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Select value={form.assignee} onValueChange={(v) => setForm({ ...form, assignee: v })}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{userName(u.id)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label htmlFor="t-due">Due date</Label>
            <Input id="t-due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
        </div>
      </div>
    </FormDrawer>
  );
}
