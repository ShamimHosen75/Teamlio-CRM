import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { EmptyState } from "@/components/shared/states";
import { OrgSwitcher } from "@/components/cloud/work-ui";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate } from "@/lib/format";
import { ORG_ROLE_TO_ROLE_NAME, ORG_ROLE_DESCRIPTIONS, ROLE_PERMISSIONS, PERMISSIONS } from "@/lib/permissions";
import { useActiveOrg } from "@/hooks/use-active-org";
import {
  ORG_ROLES,
  useMyMembership,
  useOrgMembers,
  useOrgProjects,
  useOrgTasks,
  useUpdateMember,
  type CloudMember,
  type OrgRole,
} from "@/hooks/use-cloud";

export const Route = createFileRoute("/_authenticated/admin/employees")({
  head: () => ({
    meta: [
      { title: "Employees — Project CRM" },
      {
        name: "description",
        content: "Every team member in your workspace with their role, account status and what their access unlocks.",
      },
      { property: "og:title", content: "Employees — Project CRM" },
      { property: "og:description", content: "Assign and change roles for each team member in your live workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmployeesPage,
});

const MEMBER_STATUSES = ["active", "invited", "disabled"] as const;

const AREA_LABELS: Record<string, string> = {
  project: "Projects",
  task: "Tasks",
  lead: "Leads",
  deal: "Deals",
  client: "Clients",
  invoice: "Billing",
  payment: "Billing",
  expense: "Expenses",
  report: "Reports",
  team: "Teams",
  user: "People",
  leave: "Leave",
  daily_update: "Daily updates",
  automation: "Automation",
  settings: "Settings",
  admin: "Administration",
  audit: "Audit",
};

function accessFor(role: OrgRole) {
  const list = ROLE_PERMISSIONS[ORG_ROLE_TO_ROLE_NAME[role] ?? ""] ?? [];
  const areas = new Set<string>();
  for (const p of list) {
    const label = AREA_LABELS[p.split(".")[0] ?? ""];
    if (label) areas.add(label);
  }
  return { count: list.length, areas: Array.from(areas) };
}

function EmployeesPage() {
  const { orgs, activeOrgId, setOrgId } = useActiveOrg();
  const { data: members = [], isLoading } = useOrgMembers(activeOrgId);
  const { data: membership } = useMyMembership(activeOrgId);
  const { data: projects = [] } = useOrgProjects(activeOrgId);
  const { data: tasks = [] } = useOrgTasks(activeOrgId);
  const updateMember = useUpdateMember();
  const canManage = membership?.role === "owner" || membership?.role === "admin";

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | OrgRole>("all");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (!q) return true;
      return `${m.profile?.full_name ?? ""} ${m.profile?.email ?? ""} ${m.job_title ?? ""}`.toLowerCase().includes(q);
    });
  }, [members, roleFilter, search]);

  return (
    <PermissionGuard permission="user.read" mode="page">
      <div className="mx-auto max-w-[1400px]">
        <PageHeader
          title="Employees"
          description="Everyone working in this workspace, the role they hold and what that role unlocks."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <OrgSwitcher orgs={orgs} value={activeOrgId} onChange={setOrgId} />
              <Link to="/admin/users">
                <Button size="sm">
                  <Plus className="size-4" /> Invite employee
                </Button>
              </Link>
            </div>
          }
        />

        {!activeOrgId ? (
          <EmptyState
            title="No workspace yet"
            description="Create an organization from Workspace Admin to start adding people."
          />
        ) : (
          <>
            <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Employees" value={members.length} loading={isLoading} />
              <StatCard
                label="Active"
                value={members.filter((m) => m.status === "active").length}
                tone="success"
                loading={isLoading}
              />
              <StatCard
                label="Managers & admins"
                value={members.filter((m) => m.role === "owner" || m.role === "admin" || m.role === "manager").length}
                loading={isLoading}
              />
              <StatCard
                label="Disabled"
                value={members.filter((m) => m.status === "disabled").length}
                tone="warning"
                loading={isLoading}
              />
            </div>

            <div className="mb-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center">
              <Input
                className="w-full sm:w-64"
                placeholder="Search name, email or job title"
                aria-label="Search employees"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as "all" | OrgRole)}>
                <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {ORG_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ORG_ROLE_TO_ROLE_NAME[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 md:hidden">
              {rows.map((m) => (
                <EmployeeCard
                  key={m.id}
                  member={m}
                  canManage={canManage}
                  projectCount={projects.filter((p) => p.manager_id === m.user_id).length}
                  taskCount={tasks.filter((t) => t.assignee_id === m.user_id && t.status !== "completed").length}
                  onRole={(role) => updateMember.mutate({ id: m.id, role }, { onSuccess: () => toast.success(`Role updated to ${ORG_ROLE_TO_ROLE_NAME[role]}`) })}
                  onStatus={(status) => updateMember.mutate({ id: m.id, status }, { onSuccess: () => toast.success("Status updated") })}
                />
              ))}
              {!rows.length && !isLoading ? <EmptyState title="No matching employees" description="Try a different name or role." /> : null}
            </div>

            <section className="surface-card hidden overflow-x-auto md:block">
              <table className="w-full min-w-[940px] text-sm">
                <thead>
                  <tr className="border-b bg-surface-muted/60 text-left">
                    <th className="px-4 py-2.5 font-medium">Employee</th>
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="px-4 py-2.5 font-medium">Workspace access</th>
                    <th className="px-4 py-2.5 font-medium">Workload</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <EmployeeRow
                      key={m.id}
                      member={m}
                      canManage={canManage}
                      projectCount={projects.filter((p) => p.manager_id === m.user_id).length}
                      taskCount={tasks.filter((t) => t.assignee_id === m.user_id && t.status !== "completed").length}
                      onRole={(role) =>
                        updateMember.mutate(
                          { id: m.id, role },
                          {
                            onSuccess: () =>
                              toast.success(`Role updated to ${ORG_ROLE_TO_ROLE_NAME[role]}`),
                            onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update the role"),
                          },
                        )
                      }
                      onStatus={(status) =>
                        updateMember.mutate(
                          { id: m.id, status },
                          {
                            onSuccess: () => toast.success("Status updated"),
                            onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update the status"),
                          },
                        )
                      }
                    />
                  ))}
                  {!rows.length && !isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No employees match this search.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>

            <p className="mt-3 text-xs text-muted-foreground">
              Changing a role takes effect immediately: menus, pages and the assistant follow the new access level.
            </p>
          </>
        )}
      </div>
    </PermissionGuard>
  );
}

function EmployeeCard({ member, canManage, projectCount, taskCount, onRole, onStatus }: {
  member: CloudMember;
  canManage: boolean;
  projectCount: number;
  taskCount: number;
  onRole: (role: OrgRole) => void;
  onStatus: (status: (typeof MEMBER_STATUSES)[number]) => void;
}) {
  const name = member.profile?.full_name || member.profile?.email || "Team member";
  const access = accessFor(member.role);
  const editable = canManage && member.role !== "owner";
  return (
    <article className="surface-card min-w-0 p-4">
      <div className="min-w-0">
        <p className="truncate font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{member.profile?.email ?? "—"}</p>
        {member.job_title ? <p className="text-xs text-muted-foreground">{member.job_title}</p> : null}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-1 text-xs text-muted-foreground">Role</p>
          {editable ? (
            <Select value={member.role} onValueChange={(v) => onRole(v as OrgRole)}>
              <SelectTrigger aria-label={`Role for ${name}`}><SelectValue /></SelectTrigger>
              <SelectContent>{ORG_ROLES.filter((r) => r !== "owner").map((r) => <SelectItem key={r} value={r}>{ORG_ROLE_TO_ROLE_NAME[r]}</SelectItem>)}</SelectContent>
            </Select>
          ) : <Badge variant="secondary">{ORG_ROLE_TO_ROLE_NAME[member.role]}</Badge>}
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-xs text-muted-foreground">Status</p>
          {editable ? (
            <Select value={member.status} onValueChange={(v) => onStatus(v as (typeof MEMBER_STATUSES)[number])}>
              <SelectTrigger aria-label={`Status for ${name}`}><SelectValue /></SelectTrigger>
              <SelectContent>{MEMBER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          ) : <Badge variant="secondary">{member.status}</Badge>}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{access.count} permissions · {projectCount} projects led · {taskCount} open tasks</p>
      <p className="mt-1 text-xs text-muted-foreground">Joined {fmtDate(member.created_at)}</p>
    </article>
  );
}

function EmployeeRow({
  member,
  canManage,
  projectCount,
  taskCount,
  onRole,
  onStatus,
}: {
  member: CloudMember;
  canManage: boolean;
  projectCount: number;
  taskCount: number;
  onRole: (role: OrgRole) => void;
  onStatus: (status: (typeof MEMBER_STATUSES)[number]) => void;
}) {
  const name = member.profile?.full_name || member.profile?.email || "Team member";
  const access = accessFor(member.role);
  const editable = canManage && member.role !== "owner";

  return (
    <tr className="border-b align-top last:border-0">
      <td className="px-4 py-3">
        <p className="font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{member.profile?.email ?? "—"}</p>
        {member.job_title ? <p className="text-xs text-muted-foreground">{member.job_title}</p> : null}
      </td>
      <td className="px-4 py-3">
        {editable ? (
          <Select value={member.role} onValueChange={(v) => onRole(v as OrgRole)}>
            <SelectTrigger className="w-[170px]" aria-label={`Role for ${name}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORG_ROLES.filter((r) => r !== "owner").map((r) => (
                <SelectItem key={r} value={r}>
                  {ORG_ROLE_TO_ROLE_NAME[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary">{ORG_ROLE_TO_ROLE_NAME[member.role]}</Badge>
        )}
        <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">{ORG_ROLE_DESCRIPTIONS[member.role]}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {access.count} of {PERMISSIONS.length} permissions
        </p>
        <div className="mt-1.5 flex max-w-[280px] flex-wrap gap-1">
          {access.areas.slice(0, 5).map((a) => (
            <Badge key={a} variant="outline" className="text-[11px]">
              {a}
            </Badge>
          ))}
          {access.areas.length > 5 ? (
            <Badge variant="outline" className="text-[11px]">
              +{access.areas.length - 5} more
            </Badge>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        <p>{projectCount} projects led</p>
        <p>{taskCount} open tasks</p>
      </td>
      <td className="px-4 py-3">
        {editable ? (
          <Select value={member.status} onValueChange={(v) => onStatus(v as (typeof MEMBER_STATUSES)[number])}>
            <SelectTrigger className="w-[130px]" aria-label={`Status for ${name}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMBER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary">{member.status}</Badge>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(member.created_at)}</td>
    </tr>
  );
}
