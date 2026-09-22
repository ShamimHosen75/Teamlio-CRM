import type { ReactNode } from "react";
import { Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";
import { OrgSwitcher } from "@/components/cloud/work-ui";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useOrgMembers, useSession, type CloudMember } from "@/hooks/use-cloud";

export function useLiveOrgContext() {
  const { user } = useSession();
  const { orgs, activeOrg, activeOrgId, setOrgId, isLoading } = useActiveOrg();
  const { data: members = [] } = useOrgMembers(activeOrgId);
  const myRole = members.find((m) => m.user_id === user?.id)?.role;
  const isOwner = activeOrg?.owner_id === user?.id;
  const canManage =
    isOwner ||
    !myRole && !!user ||
    ["owner", "admin", "manager", "sales_manager", "sales", "member"].includes(myRole || "");
  return { user, orgs, activeOrg, activeOrgId, setOrgId, isLoading, members, canManage, myRole, isOwner };
}

/** Page frame shared by every live workspace page: header, org switcher, empty state. */
export function LivePage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { orgs, activeOrg, activeOrgId, setOrgId, isLoading } = useLiveOrgContext();
  return (
    <div className="mx-auto min-w-0 max-w-[1600px]">
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="grid w-full min-w-0 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            <OrgSwitcher orgs={orgs} value={activeOrgId} onChange={setOrgId} />
            {actions}
          </div>
        }
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      ) : !activeOrg ? (
        <EmptyState
          icon={Building2}
          title="No organization yet"
          description="Create your first organization in Workspace Admin to start storing real records."
        />
      ) : (
        children
      )}
    </div>
  );
}

export function memberName(members: CloudMember[], userId: string | null) {
  if (!userId) return "Unassigned";
  const match = members.find((m) => m.user_id === userId);
  return match?.profile?.full_name || match?.profile?.email || "Member";
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const id = `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
