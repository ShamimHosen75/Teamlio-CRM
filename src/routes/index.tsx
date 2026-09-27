import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FolderKanban,
  Handshake,
  ListChecks,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { MetricChart } from "@/components/shared/metric-chart";
import { StatusBadge } from "@/components/shared/badges";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { UserAvatarGroup, UserCell, userName } from "@/components/shared/user-avatar";
import { ErrorState, SkeletonCard } from "@/components/shared/states";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DATE_RANGES } from "@/lib/constants";
import { fmtDate, money } from "@/lib/format";
import {
  useActivities,
  useClients,
  useDailyUpdates,
  useDeals,
  useInvoices,
  useLeads,
  useLeaveRequests,
  useMeetings,
  useProjects,
  useTasks,
  useUsers,
} from "@/hooks/use-data";
import { useWorkspace } from "@/app/workspace";
import { useSession } from "@/hooks/use-cloud";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Teamlio" },
      {
        name: "description",
        content: "Live overview of projects, tasks, pipeline, team workload and revenue.",
      },
      { property: "og:title", content: "Dashboard — Teamlio" },
      { property: "og:description", content: "Projects, pipeline, workload and revenue at a glance." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const [range, setRange] = useState("30 Days");
  const projects = useProjects();
  const tasks = useTasks();
  const leads = useLeads();
  const deals = useDeals();
  const users = useUsers();
  const invoices = useInvoices();
  const meetings = useMeetings();
  const leave = useLeaveRequests();
  const daily = useDailyUpdates();
  const clients = useClients();
  const activities = useActivities();
  const { user } = useSession();
  const { currentUser } = useWorkspace();

  const loading = projects.isLoading || tasks.isLoading || leads.isLoading;
  const failed = projects.isError || tasks.isError;

  const projectRows = projects.data ?? [];
  const taskRows = tasks.data ?? [];
  const leadRows = leads.data ?? [];
  const dealRows = deals.data ?? [];
  const invoiceRows = invoices.data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const activeProjects = projectRows.filter((p) => p.status === "In Progress").length;
  const completedProjects = projectRows.filter((p) => p.status === "Completed").length;
  const pendingTasks = taskRows.filter((t) => t.status !== "Completed").length;
  const overdueTasks = taskRows.filter((t) => t.due_date < today && t.status !== "Completed").length;
  const newLeads = leadRows.filter((l) => l.status === "New" || l.status === "Contacted").length;
  const activeDeals = dealRows.filter((d) => d.stage !== "Won" && d.stage !== "Lost").length;
  const revenue = invoiceRows.filter((i) => i.status === "Paid").reduce((s, i) => s + i.paid_amount, 0);

  const statusData = [
    "Planned",
    "In Progress",
    "Under Review",
    "On Hold",
    "Completed",
    "Overdue",
  ].map((status) => ({ status, projects: projectRows.filter((p) => p.status === status).length }));

  const pipelineData = ["New Opportunity", "Qualified", "Proposal", "Negotiation", "Won"].map((stage) => ({
    stage: stage.replace(" Opportunity", ""),
    value: dealRows.filter((d) => d.stage === stage).reduce((s, d) => s + d.value, 0),
  }));

  const taskProgress = ["Backlog", "To Do", "In Progress", "Review", "Completed", "Blocked"].map((s) => ({
    status: s,
    tasks: taskRows.filter((t) => t.status === s).length,
  }));

  const trend = Array.from({ length: 8 }).map((_, i) => ({
    week: `W${i + 1}`,
    completed: 8 + ((i * 5) % 14),
    created: 10 + ((i * 7) % 12),
  }));

  const workload = (users.data ?? [])
    .filter((u) => u.status === "Active")
    .slice(0, 6)
    .map((u) => ({
      user: u,
      open: taskRows.filter((t) => t.assignee_ids.includes(u.id) && t.status !== "Completed").length,
    }));

  const upcomingMeetings = (meetings.data ?? []).filter((m) => m.status === "Scheduled").slice(0, 4);
  const pendingLeave = (leave.data ?? []).filter((l) => l.status === "Pending");
  const todayUpdates = (daily.data ?? []).filter((d) => d.date === today);
  const deadlines = [...projectRows]
    .filter((p) => p.status !== "Completed" && p.status !== "Archived")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5);

  if (failed) {
    return <ErrorState onRetry={() => projects.refetch()} />;
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      {user ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary-soft/40 px-4 py-2.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-success" />
            <span>
              Signed in as <strong>{currentUser.email}</strong>
            </span>
          </div>
          <Link to="/admin/workspace">
            <Button size="sm" className="h-7 text-xs">
              Go to live workspace &rarr;
            </Button>
          </Link>
        </div>
      ) : null}

      <PageHeader
        title={`Good morning, ${user && currentUser?.full_name ? currentUser.full_name.split(" ")[0] : userName("usr_001").split(" ")[0]}`}
        description="Here's what's happening across your workspace today."
        actions={
          <Tabs value={range} onValueChange={setRange}>
            <TabsList className="flex-wrap">
              {DATE_RANGES.map((r) => (
                <TabsTrigger key={r} value={r} className="text-xs">
                  {r}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Projects" value={activeProjects} icon={FolderKanban} delta={12} hint="vs last period" loading={loading} />
        <StatCard label="Completed Projects" value={completedProjects} icon={CheckCircle2} tone="success" delta={4} loading={loading} />
        <StatCard label="Pending Tasks" value={pendingTasks} icon={ListChecks} delta={-6} loading={loading} />
        <StatCard label="Overdue Tasks" value={overdueTasks} icon={AlertTriangle} tone="destructive" delta={9} loading={loading} />
        <StatCard label="New Leads" value={newLeads} icon={Target} delta={18} loading={loading} />
        <StatCard label="Active Deals" value={activeDeals} icon={Handshake} delta={7} loading={loading} />
        <StatCard label="Revenue Collected" value={money(revenue)} icon={CircleDollarSign} tone="success" delta={11} loading={loading} />
        <StatCard label="Team Members" value={(users.data ?? []).length} icon={Users} hint={`${clients.data?.length ?? 0} active clients`} loading={loading} />
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-3">
        <Panel title="Task throughput" subtitle="Created vs completed per week" className="xl:col-span-2">
          {loading ? <SkeletonCard lines={5} /> : <MetricChart type="area" data={trend} xKey="week" series={[{ key: "created", label: "Created" }, { key: "completed", label: "Completed" }]} />}
        </Panel>
        <Panel title="Project status" subtitle="Distribution across delivery stages">
          <MetricChart type="bar" data={statusData} xKey="status" series={[{ key: "projects", label: "Projects" }]} />
        </Panel>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="CRM pipeline" subtitle="Weighted value by stage">
          <MetricChart type="bar" data={pipelineData} xKey="stage" series={[{ key: "value", label: "Pipeline value" }]} />
        </Panel>
        <Panel title="Task progress" subtitle="Current board state">
          <MetricChart type="pie" data={taskProgress} xKey="status" series={[{ key: "tasks", label: "Tasks" }]} />
        </Panel>
        <Panel title="Team workload" subtitle="Open tasks per member">
          <ul className="space-y-3">
            {workload.map(({ user, open }) => (
              <li key={user.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <UserCell userId={user.id} subtitle={user.job_title} />
                  <span className="text-sm font-medium">{open}</span>
                </div>
                <Progress value={Math.min(100, open * 12)} className="h-1.5" />
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Upcoming deadlines" subtitle="Projects closing soon">
          <ul className="divide-y">
            {deadlines.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link to="/projects/$projectId" params={{ projectId: p.id }} className="truncate text-sm font-medium hover:text-primary">
                    {p.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">Due {fmtDate(p.due_date)}</p>
                </div>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Daily work updates" subtitle="Submission status for today">
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Submitted" value={todayUpdates.filter((u) => u.status === "Submitted").length} tone="success" />
            <MiniStat label="Late" value={todayUpdates.filter((u) => u.status === "Late").length} tone="warning" />
            <MiniStat label="Missing" value={todayUpdates.filter((u) => u.status === "Missing").length} tone="destructive" />
            <MiniStat label="On leave" value={pendingLeave.length} tone="muted" />
          </div>
          <Link to="/daily-updates" className="mt-4 inline-flex text-sm text-primary hover:underline">
            Review team updates
          </Link>
        </Panel>

        <Panel title="Upcoming meetings" subtitle="Next on the calendar">
          <ul className="divide-y">
            {upcomingMeetings.map((m) => (
              <li key={m.id} className="flex items-start gap-3 py-2.5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <CalendarClock className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(m.date)} · {m.start_time}–{m.end_time}
                  </p>
                </div>
                <UserAvatarGroup userIds={m.participant_ids} max={3} />
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Financial overview" subtitle="Invoicing health" className="xl:col-span-1">
          <div className="space-y-3 text-sm">
            <Row label="Invoiced" value={money(invoiceRows.reduce((s, i) => s + i.items.reduce((a, it) => a + it.quantity * it.rate, 0), 0))} />
            <Row label="Collected" value={money(revenue)} />
            <Row label="Outstanding" value={money(invoiceRows.filter((i) => i.status !== "Paid" && i.status !== "Cancelled").reduce((s, i) => s + i.items.reduce((a, it) => a + it.quantity * it.rate, 0) - i.paid_amount, 0))} />
            <Row label="Overdue invoices" value={String(invoiceRows.filter((i) => i.status === "Overdue").length)} />
          </div>
        </Panel>

        <Panel title="Recent activity" subtitle="Across the workspace">
          <ActivityTimeline events={activities.data ?? []} limit={5} />
        </Panel>

        <Panel title="AI insights" subtitle="Generated from current workspace data">
          <ul className="space-y-3 text-sm">
            {[
              "Two projects are trending behind schedule — Property Listing Platform needs a replan.",
              "Pipeline coverage is healthy, but proposals are ageing past 14 days on average.",
              "Three team members are carrying above-average task load this week.",
            ].map((insight) => (
              <li key={insight} className="flex gap-2.5 rounded-lg bg-surface-muted p-3">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{insight}</span>
              </li>
            ))}
          </ul>
          <Link to="/ai-assistant" className="mt-4 inline-flex text-sm text-primary hover:underline">
            Open AI assistant
          </Link>
        </Panel>
      </section>

      <section className="mt-4">
        <Panel title="Notifications" subtitle="Latest alerts requiring attention">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { icon: ClipboardList, text: "6 daily updates still missing for today." },
              { icon: AlertTriangle, text: `${overdueTasks} tasks are past their due date.` },
              { icon: CircleDollarSign, text: "2 invoices are overdue by more than 5 days." },
            ].map((n) => (
              <div key={n.text} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                <n.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>{n.text}</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`surface-card p-4 ${className ?? ""}`}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" | "destructive" | "muted" }) {
  const tones = {
    success: "text-success",
    warning: "text-warning-foreground",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
  };
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tones[tone]}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
