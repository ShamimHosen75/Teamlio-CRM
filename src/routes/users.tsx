import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FormDrawer } from "@/components/shared/form-drawer";
import { StatusBadge } from "@/components/shared/badges";
import { UserCell } from "@/components/shared/user-avatar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDateTime } from "@/lib/format";
import { useWorkspace } from "@/app/workspace";
import { useRoles, useUsers } from "@/hooks/use-data";
import type { User } from "@/lib/types";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users — Teamlio" },
      { name: "description", content: "Invite teammates, assign roles and manage workspace access." },
      { property: "og:title", content: "Users — Teamlio" },
      { property: "og:description", content: "Invite teammates and manage workspace access." },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { data: users = [], isLoading } = useUsers();
  const { data: roles = [] } = useRoles();
  const { can } = useWorkspace();

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? "—";
  const canManage = can("user.manage");

  const columns: Column<User>[] = [
    { key: "user", header: "User", sortable: true, sortValue: (r) => r.full_name, render: (r) => <UserCell userId={r.id} subtitle={r.email} /> },
    { key: "title", header: "Job title", hideBelow: "lg", render: (r) => r.job_title },
    { key: "role", header: "Role", hideBelow: "md", render: (r) => roleName(r.role_id) },
    { key: "status", header: "Status", sortable: true, sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    { key: "last", header: "Last login", hideBelow: "xl", render: (r) => (r.last_login_at ? fmtDateTime(r.last_login_at) : "Never") },
    ...(canManage
      ? [
          {
            key: "actions" as const,
            header: "",
            render: (r: User) => (
              <ConfirmDialog
                trigger={<Button variant="ghost" size="sm">Deactivate</Button>}
                title={`Deactivate ${r.full_name}?`}
                description="They will immediately lose access to this workspace. You can reactivate them later."
                confirmLabel="Deactivate"
                destructive
                onConfirm={() => toast.success(`${r.full_name} deactivated`)}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <PermissionGuard permission="user.read" mode="page">
      <div className="mx-auto max-w-[1600px]">
        <PageHeader
          title="Users"
          description="Everyone with access to this workspace and the role they hold."
          actions={
            <PermissionGuard permission="user.manage">
              <InviteDrawer roles={roles.map((r) => r.name)} />
            </PermissionGuard>
          }
        />
        <DataTable
          data={users}
          columns={columns}
          loading={isLoading}
          searchKeys={["full_name", "email", "job_title"]}
          searchPlaceholder="Search users…"
          pageSize={12}
          mobileCard={(r) => (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <UserCell userId={r.id} subtitle={r.job_title} />
                <StatusBadge status={r.status} />
              </div>
              <p className="text-xs text-muted-foreground">{roleName(r.role_id)}</p>
            </div>
          )}
        />
      </div>
    </PermissionGuard>
  );
}

function InviteDrawer({ roles }: { roles: string[] }) {
  const [form, setForm] = useState({ email: "", name: "", role: roles[0] ?? "Team Member" });
  const [error, setError] = useState("");

  return (
    <FormDrawer
      trigger={<Button size="sm"><UserPlus className="size-4" /> Invite user</Button>}
      title="Invite a teammate"
      description="Invitations are represented in the interface; email delivery is added when the backend is connected."
      submitLabel="Send invitation"
      onSubmit={() => {
        if (!form.email.includes("@")) {
          setError("Enter a valid email address.");
          return false;
        }
        toast.success(`Invitation queued for ${form.email}`);
        setForm({ email: "", name: "", role: roles[0] ?? "Team Member" });
        setError("");
        return true;
      }}
    >
      <div className="space-y-4">
        {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        <div className="space-y-1.5">
          <Label htmlFor="i-email">Work email</Label>
          <Input id="i-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="i-name">Full name</Label>
          <Input id="i-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </FormDrawer>
  );
}
