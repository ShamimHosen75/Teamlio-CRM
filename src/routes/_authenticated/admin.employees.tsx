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
import { useWorkspace } from "@/app/workspace";
import {
  ORG_ROLES,
  resolveRequestedRole,
  useAllProfiles,
  useMyMembership,
  useOrgMembers,
  useOrgProjects,
  useOrgTasks,
  useSession,
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
  const { user } = useSession();
  const { currentUser } = useWorkspace();
  const { orgs, activeOrgId, activeOrg, setOrgId } = useActiveOrg();
  const { data: members = [], isLoading: isMembersLoading } = useOrgMembers(activeOrgId);
  const { data: allProfiles = [], isLoading: isProfilesLoading } = useAllProfiles();
  const { data: membership, isLoading: isMembershipLoading } = useMyMembership(activeOrgId);
  const { data: projects = [] } = useOrgProjects(activeOrgId);
  const { data: tasks = [] } = useOrgTasks(activeOrgId);
  const updateMember = useUpdateMember();
  const isLoading = isMembersLoading || isProfilesLoading || isMembershipLoading;

  const userReqRole = (user?.user_metadata?.requested_role as string | undefined)?.toLowerCase();
  const isOwner =
    membership?.role === "owner" ||
    activeOrg?.owner_id === user?.id ||
    userReqRole === "owner" ||
    currentUser?.role_id === "role_1" ||
    currentUser?.job_title?.toLowerCase().includes("owner") ||
    (currentUser as any)?.role === "Organization Owner";

  const isAdmin =
    membership?.role === "admin" ||
    userReqRole === "admin" ||
    currentUser?.role_id === "role_2" ||
    currentUser?.job_title?.toLowerCase().includes("admin") ||
    (currentUser as any)?.role === "Admin";

  const isManager =
    membership?.role === "manager" ||
    userReqRole === "manager" ||
    currentUser?.role_id === "role_3" ||
    currentUser?.job_title?.toLowerCase().includes("manager") ||
    currentUser?.job_title?.toLowerCase().includes("lead") ||
    (currentUser as any)?.role === "Project Manager";

  // Check if current user has an elevated role: admin / owner / manager
  const isElevatedRole = isOwner || isAdmin || isManager;
  const canManage = isOwner || isAdmin;

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | OrgRole>("all");

  const allEmployees = useMemo(() => {
    const memberMap = new Map<string, CloudMember>();

    // 1. Add members explicitly assigned to the active workspace
    for (const m of members) {
      const key = m.user_id || m.id;
      memberMap.set(key, m);
    }

    // 2. Ensure current authenticated user's own account is included
    if (user) {
      const existing = memberMap.get(user.id);
      const userJobTitle =
        (user.user_metadata?.job_title as string) ||
        (user.user_metadata?.requested_role ? resolveRequestedRole(user.user_metadata?.requested_role).jobTitle : (isOwner ? "Workspace Owner" : "Team Member"));
      const userRole: OrgRole =
        membership?.role ||
        (activeOrg?.owner_id === user.id ? "owner" : (user.user_metadata?.requested_role?.toLowerCase() as OrgRole) || (isOwner ? "owner" : isAdmin ? "admin" : isManager ? "manager" : "member"));

      if (existing) {
        if (!existing.profile) {
          existing.profile = {
            id: user.id,
            full_name: (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "User",
            email: user.email || "",
            avatar_url: (user.user_metadata?.avatar_url as string) || null,
            job_title: userJobTitle,
            created_at: user.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      } else {
        memberMap.set(user.id, {
          id: `user_${user.id}`,
          organization_id: activeOrgId || "",
          user_id: user.id,
          role: userRole,
          status: "active",
          job_title: userJobTitle,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          profile: {
            id: user.id,
            full_name: (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "User",
            email: user.email || "",
            avatar_url: (user.user_metadata?.avatar_url as string) || null,
            job_title: userJobTitle,
            created_at: user.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });
      }
    }

    // 3. Add all profiles from Supabase database
    for (const p of allProfiles) {
      if (memberMap.has(p.id)) {
        const existing = memberMap.get(p.id)!;
        if (!existing.profile) existing.profile = p;
        continue;
      }

      const emailMatch = Array.from(memberMap.values()).find(
        (m) => m.profile?.email && m.profile.email.toLowerCase() === (p.email || "").toLowerCase()
      );
      if (emailMatch) {
        if (!emailMatch.profile) emailMatch.profile = p;
        continue;
      }

      const pTitle = (p.job_title || "").toLowerCase();
      const pRole: OrgRole =
        activeOrg?.owner_id === p.id
          ? "owner"
          : pTitle.includes("admin")
          ? "admin"
          : pTitle.includes("manager") || pTitle.includes("lead")
          ? "manager"
          : "member";

      memberMap.set(p.id, {
        id: `profile_${p.id}`,
        organization_id: activeOrgId || "",
        user_id: p.id,
        role: pRole,
        status: "active",
        job_title: p.job_title || (pRole === "owner" ? "Workspace Owner" : "Team Member"),
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || p.created_at || new Date().toISOString(),
        profile: p,
      });
    }

    return Array.from(memberMap.values());
  }, [members, user, allProfiles, activeOrgId, isOwner, isAdmin, isManager, membership?.role, activeOrg?.owner_id]);

  // Show all employees profile if user role is admin / owner / manager, including user own account.
  // Otherwise, only show user's own account.
  const visibleMembers = useMemo(() => {
    if (isElevatedRole) {
      return allEmployees;
    }

    // Regular employee / member: show only user's own profile / account
    if (user?.id) {
      const self = allEmployees.filter(
        (m) =>
          m.user_id === user.id ||
          (user.email && m.profile?.email?.toLowerCase() === user.email.toLowerCase())
      );
      if (self.length > 0) return self;
    }

    if (currentUser?.id) {
      const self = allEmployees.filter((m) => m.user_id === currentUser.id);
      if (self.length > 0) return self;
    }

    return allEmployees.slice(0, 1);
  }, [allEmployees, isElevatedRole, user?.id, user?.email, currentUser?.id]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleMembers.filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (!q) return true;
      return `${m.profile?.full_name ?? ""} ${m.profile?.email ?? ""} ${m.job_title ?? ""}`.toLowerCase().includes(q);
    });
  }, [visibleMembers, roleFilter, search]);

  const currentUserId = user?.id || currentUser?.id;
  const currentUserEmail = user?.email?.toLowerCase();

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
              <StatCard label="Employees" value={visibleMembers.length} loading={isLoading} />
              <StatCard
                label="Active"
                value={visibleMembers.filter((m) => m.status === "active").length}
                tone="success"
                loading={isLoading}
              />
              <StatCard
                label="Managers & admins"
                value={visibleMembers.filter((m) => m.role === "owner" || m.role === "admin" || m.role === "manager").length}
                loading={isLoading}
              />
              <StatCard
                label="Disabled"
                value={visibleMembers.filter((m) => m.status === "disabled").length}
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
              {rows.map((m) => {
                const isSelf =
                  (currentUserId && m.user_id === currentUserId) ||
                  (currentUserEmail && m.profile?.email?.toLowerCase() === currentUserEmail);
                return (
                  <EmployeeCard
                    key={m.id}
                    member={m}
                    canManage={canManage}
                    isCurrentUser={!!isSelf}
                    projectCount={projects.filter((p) => p.manager_id === m.user_id).length}
                    taskCount={tasks.filter((t) => t.assignee_id === m.user_id && t.status !== "completed").length}
                    onRole={(role) =>
                      updateMember.mutate(
                        {
                          id: m.id,
                          role,
                          organization_id: activeOrgId,
                          user_id: m.user_id,
                          job_title: m.job_title,
                        },
                        {
                          onSuccess: () =>
                            toast.success(`Role updated to ${ORG_ROLE_TO_ROLE_NAME[role]}`),
                          onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update the role"),
                        },
                      )
                    }
                    onStatus={(status) =>
                      updateMember.mutate(
                        {
                          id: m.id,
                          status,
                          organization_id: activeOrgId,
                          user_id: m.user_id,
                          job_title: m.job_title,
                        },
                        {
                          onSuccess: () => toast.success("Status updated"),
                          onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update the status"),
                        },
                      )
                    }
                  />
                );
              })}
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
                  {rows.map((m) => {
                    const isSelf =
                      (currentUserId && m.user_id === currentUserId) ||
                      (currentUserEmail && m.profile?.email?.toLowerCase() === currentUserEmail);
                    return (
                      <EmployeeRow
                        key={m.id}
                        member={m}
                        canManage={canManage}
                        isCurrentUser={!!isSelf}
                        projectCount={projects.filter((p) => p.manager_id === m.user_id).length}
                        taskCount={tasks.filter((t) => t.assignee_id === m.user_id && t.status !== "completed").length}
                        onRole={(role) =>
                          updateMember.mutate(
                            {
                              id: m.id,
                              role,
                              organization_id: activeOrgId,
                              user_id: m.user_id,
                              job_title: m.job_title,
                            },
                            {
                              onSuccess: () =>
                                toast.success(`Role updated to ${ORG_ROLE_TO_ROLE_NAME[role]}`),
                              onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update the role"),
                            },
                          )
                        }
                        onStatus={(status) =>
                          updateMember.mutate(
                            {
                              id: m.id,
                              status,
                              organization_id: activeOrgId,
                              user_id: m.user_id,
                              job_title: m.job_title,
                            },
                            {
                              onSuccess: () => toast.success("Status updated"),
                              onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update the status"),
                            },
                          )
                        }
                      />
                    );
                  })}
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

function EmployeeCard({
  member,
  canManage,
  isCurrentUser,
  projectCount,
  taskCount,
  onRole,
  onStatus,
}: {
  member: CloudMember;
  canManage: boolean;
  isCurrentUser?: boolean;
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
        <p className="truncate font-medium flex items-center gap-1.5">
          {name}
          {isCurrentUser ? (
            <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal text-muted-foreground">
              You
            </Badge>
          ) : null}
        </p>
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
  isCurrentUser,
  projectCount,
  taskCount,
  onRole,
  onStatus,
}: {
  member: CloudMember;
  canManage: boolean;
  isCurrentUser?: boolean;
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
        <p className="font-medium flex items-center gap-1.5">
          {name}
          {isCurrentUser ? (
            <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal text-muted-foreground">
              You
            </Badge>
          ) : null}
        </p>
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
