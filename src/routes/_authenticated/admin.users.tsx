import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { FormDrawer } from "@/components/shared/form-drawer";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { EmptyState } from "@/components/shared/states";
import { OrgSwitcher } from "@/components/cloud/work-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate } from "@/lib/format";
import { ORG_ROLE_TO_ROLE_NAME } from "@/lib/permissions";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useWorkspace } from "@/app/workspace";
import {
  ORG_ROLES,
  resolveRequestedRole,
  useAllProfiles,
  useCancelInvite,
  useInviteMember,
  useMyMembership,
  useOrgInvites,
  useOrgMembers,
  useRemoveMember,
  useSession,
  useUpdateMember,
  type CloudMember,
  type OrgRole,
} from "@/hooks/use-cloud";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "User Management — Project CRM" },
      { name: "description", content: "Invite real people, set their workspace role and manage account status." },
      { property: "og:title", content: "User Management — Project CRM" },
      { property: "og:description", content: "Invitations, roles and account status for your live workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminUsersPage,
});

const MEMBER_STATUSES = ["active", "invited", "disabled"] as const;

function AdminUsersPage() {
  const { user } = useSession();
  const { currentUser, can } = useWorkspace();
  const { orgs, activeOrgId, activeOrg, setOrgId } = useActiveOrg();
  const { data: members = [], isLoading: isMembersLoading } = useOrgMembers(activeOrgId);
  const { data: allProfiles = [], isLoading: isProfilesLoading } = useAllProfiles();
  const { data: invites = [] } = useOrgInvites(activeOrgId);
  const { data: membership, isLoading: isMembershipLoading } = useMyMembership(activeOrgId);
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

  // Only admin or owner can manage users, view all user profiles, and remove employee accounts
  const isOwnerOrAdmin = isOwner || isAdmin;
  const canManage = isOwnerOrAdmin;

  const updateMember = useUpdateMember();
  const removeMember = useRemoveMember();
  const cancelInvite = useCancelInvite();
  const pending = invites.filter((i) => !i.accepted_at);

  const currentUserId = user?.id || currentUser?.id;
  const currentUserEmail = user?.email?.toLowerCase();

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
        (activeOrg?.owner_id === user.id ? "owner" : (user.user_metadata?.requested_role?.toLowerCase() as OrgRole) || (isOwner ? "owner" : isAdmin ? "admin" : "member"));

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

    // 3. Add all profiles from Supabase database (real registered accounts)
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
  }, [members, user, allProfiles, activeOrgId, isOwner, isAdmin, membership?.role, activeOrg?.owner_id]);

  // Restriction: Only admin or owner can view all user profiles in user management.
  // Non-admin / non-owner users cannot see all user profiles.
  const visibleMembers = useMemo(() => {
    if (!isOwnerOrAdmin) {
      return [];
    }
    return allEmployees;
  }, [allEmployees, isOwnerOrAdmin]);

  const canRemoveMember = (m: CloudMember) => {
    if (!isOwnerOrAdmin) return false;
    // Cannot remove owner
    if (m.role === "owner") return false;
    // Cannot remove self
    if (m.user_id === currentUserId) return false;
    // Admin cannot remove other admins (only owner can)
    if (!isOwner && m.role === "admin") return false;
    return true;
  };

  return (
    <PermissionGuard permission="user.manage" mode="page">
      <div className="mx-auto max-w-[1400px]">
        <PageHeader
          title="User management"
          description="Everyone in this workspace, and exactly what their role grants them."
          actions={
            <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
              <OrgSwitcher orgs={orgs} value={activeOrgId} onChange={setOrgId} />
              {canManage ? <InviteDrawer organizationId={activeOrgId} /> : null}
            </div>
          }
        />

        {!activeOrgId ? (
          <EmptyState
            title="No workspace yet"
            description="Create an organization from Workspace Admin to start inviting people."
          />
        ) : !isOwnerOrAdmin ? (
          <EmptyState
            title="Access restricted"
            description="Only workspace administrators and owners have permission to view all user profiles and manage employee accounts."
          />
        ) : (
          <>
            <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="People" value={visibleMembers.length} loading={isLoading} />
              <StatCard label="Active" value={visibleMembers.filter((m) => m.status === "active").length} tone="success" loading={isLoading} />
              <StatCard label="Pending invites" value={pending.length} tone="warning" loading={isLoading} />
              <StatCard label="Disabled" value={visibleMembers.filter((m) => m.status === "disabled").length} loading={isLoading} />
            </div>

            <div className="space-y-3 md:hidden">
              {visibleMembers.map((m) => {
                const canRemoveThis = canRemoveMember(m);
                const isSelf =
                  (currentUserId && m.user_id === currentUserId) ||
                  (currentUserEmail && m.profile?.email?.toLowerCase() === currentUserEmail);
                return (
                  <MemberCard
                    key={m.id}
                    member={m}
                    canManage={canManage}
                    canRemove={canRemoveThis}
                    isCurrentUser={!!isSelf}
                    onRole={(role) =>
                      updateMember.mutate(
                        { id: m.id, role, organization_id: activeOrgId, user_id: m.user_id, job_title: m.job_title },
                        { onSuccess: () => toast.success("Role updated") },
                      )
                    }
                    onStatus={(status) =>
                      updateMember.mutate(
                        { id: m.id, status, organization_id: activeOrgId, user_id: m.user_id, job_title: m.job_title },
                        { onSuccess: () => toast.success("Status updated") },
                      )
                    }
                    onRemove={() =>
                      removeMember.mutate(
                        { id: m.id, organization_id: activeOrgId, user_id: m.user_id },
                        {
                          onSuccess: () => toast.success(`${m.profile?.full_name || "Member"} removed from workspace`),
                          onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to remove member"),
                        },
                      )
                    }
                  />
                );
              })}
            </div>

            <section className="surface-card hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-surface-muted/60 text-left">
                    <th className="px-4 py-2.5 font-medium">Person</th>
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="px-4 py-2.5 font-medium">Access level</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Joined</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {visibleMembers.map((m) => {
                    const canRemoveThis = canRemoveMember(m);
                    const isSelf =
                      (currentUserId && m.user_id === currentUserId) ||
                      (currentUserEmail && m.profile?.email?.toLowerCase() === currentUserEmail);
                    return (
                      <MemberRow
                        key={m.id}
                        member={m}
                        canManage={canManage}
                        canRemove={canRemoveThis}
                        isCurrentUser={!!isSelf}
                        onRole={(role) =>
                          updateMember.mutate(
                            { id: m.id, role, organization_id: activeOrgId, user_id: m.user_id, job_title: m.job_title },
                            { onSuccess: () => toast.success("Role updated") },
                          )
                        }
                        onStatus={(status) =>
                          updateMember.mutate(
                            { id: m.id, status, organization_id: activeOrgId, user_id: m.user_id, job_title: m.job_title },
                            { onSuccess: () => toast.success("Status updated") },
                          )
                        }
                        onRemove={() =>
                          removeMember.mutate(
                            { id: m.id, organization_id: activeOrgId, user_id: m.user_id },
                            {
                              onSuccess: () => toast.success(`${m.profile?.full_name || "Member"} removed from workspace`),
                              onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to remove member"),
                            },
                          )
                        }
                      />
                    );
                  })}
                  {!visibleMembers.length && !isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No members found in this workspace.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>

            {pending.length ? (
              <section className="surface-card mt-5 p-5">
                <h2 className="text-sm font-semibold">Pending invitations</h2>
                <ul className="mt-3 space-y-2">
                  {pending.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{i.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {ORG_ROLE_TO_ROLE_NAME[i.role]} · invited {fmtDate(i.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = `${window.location.origin}/auth?mode=signup&email=${encodeURIComponent(i.email)}`;
                            navigator.clipboard.writeText(link);
                            toast.success(`Activation link copied for ${i.email}!`);
                          }}
                        >
                          Copy activation link
                        </Button>
                        {canManage ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelInvite.mutate(i.id, { onSuccess: () => toast.success("Invitation cancelled") })}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </PermissionGuard>
  );
}

function MemberCard({
  member,
  canManage,
  canRemove,
  isCurrentUser,
  onRole,
  onStatus,
  onRemove,
}: {
  member: CloudMember;
  canManage: boolean;
  canRemove: boolean;
  isCurrentUser?: boolean;
  onRole: (role: OrgRole) => void;
  onStatus: (status: (typeof MEMBER_STATUSES)[number]) => void;
  onRemove: () => void;
}) {
  const name = member.profile?.full_name || member.profile?.email || "Member";
  const editable = canManage && member.role !== "owner";
  return (
    <article className="surface-card min-w-0 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate font-medium flex items-center gap-1.5">
          {name}
          {isCurrentUser ? (
            <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal text-muted-foreground">
              You
            </Badge>
          ) : null}
        </p>
      </div>
      <p className="truncate text-xs text-muted-foreground">{member.profile?.email ?? "—"}</p>
      <div className="mt-4 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
        <div><p className="mb-1 text-xs text-muted-foreground">Role</p>{editable ? <Select value={member.role} onValueChange={(v) => onRole(v as OrgRole)}><SelectTrigger aria-label={`Role for ${name}`}><SelectValue /></SelectTrigger><SelectContent>{ORG_ROLES.filter((r) => r !== "owner").map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select> : <Badge variant="secondary">{member.role}</Badge>}</div>
        <div><p className="mb-1 text-xs text-muted-foreground">Status</p>{editable ? <Select value={member.status} onValueChange={(v) => onStatus(v as (typeof MEMBER_STATUSES)[number])}><SelectTrigger aria-label={`Status for ${name}`}><SelectValue /></SelectTrigger><SelectContent>{MEMBER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select> : <Badge variant="secondary">{member.status}</Badge>}</div>
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs text-muted-foreground">
        <span>{ORG_ROLE_TO_ROLE_NAME[member.role]} · joined {fmtDate(member.created_at)}</span>
        <div className="flex items-center gap-1.5">
          {editable && member.status !== "active" ? (
            <Button
              size="sm"
              className="h-7 bg-emerald-600 px-2 text-xs text-white hover:bg-emerald-700"
              onClick={() => onStatus("active")}
            >
              <Check className="mr-1 size-3" /> Approve
            </Button>
          ) : null}
          {canRemove ? (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  Remove
                </Button>
              }
              title={`Remove ${name}?`}
              description={`Are you sure you want to remove ${name} from this workspace? They will lose access immediately.`}
              confirmLabel="Remove"
              destructive
              onConfirm={onRemove}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function MemberRow({
  member,
  canManage,
  canRemove,
  isCurrentUser,
  onRole,
  onStatus,
  onRemove,
}: {
  member: CloudMember;
  canManage: boolean;
  canRemove: boolean;
  isCurrentUser?: boolean;
  onRole: (role: OrgRole) => void;
  onStatus: (status: (typeof MEMBER_STATUSES)[number]) => void;
  onRemove: () => void;
}) {
  const name = member.profile?.full_name || member.profile?.email || "Member";
  return (
    <tr className="border-b last:border-0">
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
      </td>
      <td className="px-4 py-3">
        {canManage && member.role !== "owner" ? (
          <Select value={member.role} onValueChange={(v) => onRole(v as OrgRole)}>
            <SelectTrigger className="w-[150px]" aria-label={`Role for ${name}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORG_ROLES.filter((r) => r !== "owner").map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary">{member.role}</Badge>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{ORG_ROLE_TO_ROLE_NAME[member.role]}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {canManage && member.role !== "owner" ? (
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
          {canManage && member.status !== "active" ? (
            <Button
              size="sm"
              className="h-8 bg-emerald-600 px-2.5 text-xs text-white hover:bg-emerald-700"
              onClick={() => onStatus("active")}
            >
              <Check className="mr-1 size-3" /> Approve
            </Button>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(member.created_at)}</td>
      <td className="px-4 py-3 text-right">
        {canRemove ? (
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                Remove
              </Button>
            }
            title={`Remove ${name}?`}
            description={`Are you sure you want to remove ${name} from this workspace? They will lose access immediately.`}
            confirmLabel="Remove"
            destructive
            onConfirm={onRemove}
          />
        ) : null}
      </td>
    </tr>
  );
}

function InviteDrawer({ organizationId }: { organizationId: string | undefined }) {
  const invite = useInviteMember(organizationId);
  const [form, setForm] = useState({ email: "", job_title: "", role: "member" as OrgRole });
  const [error, setError] = useState("");

  return (
    <FormDrawer
      trigger={
        <Button size="sm">
          <Plus className="size-4" /> Invite person
        </Button>
      }
      title="Invite someone"
      description="They join this workspace with the role you pick as soon as they sign up."
      submitLabel="Send invitation"
      onSubmit={async () => {
        if (!/^\S+@\S+\.\S+$/.test(form.email)) {
          setError("Enter a valid email address.");
          return false;
        }
        try {
          const res = (await invite.mutateAsync({ email: form.email, role: form.role, job_title: form.job_title })) as {
            emailSent?: boolean;
            alreadyRegistered?: boolean;
            message?: string;
          } | undefined;

          if (res?.emailSent) {
            toast.success(`Activation email sent to ${form.email}!`);
          } else if (res?.alreadyRegistered) {
            toast.success(res.message || "User added to workspace!");
          } else {
            toast.success(res?.message || `Invitation created for ${form.email}`);
          }
          setForm({ email: "", job_title: "", role: "member" });
          setError("");
          return true;
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not create the invitation.");
          return false;
        }
      }}
    >
      <div className="space-y-4">
        {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        <div className="space-y-1.5">
          <Label htmlFor="inv-email">Email</Label>
          <Input id="inv-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-title">Job title</Label>
          <Input id="inv-title" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as OrgRole })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORG_ROLES.filter((r) => r !== "owner").map((r) => (
                <SelectItem key={r} value={r}>
                  {r} — {ORG_ROLE_TO_ROLE_NAME[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </FormDrawer>
  );
}
