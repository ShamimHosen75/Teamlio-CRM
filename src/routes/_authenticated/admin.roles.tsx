import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { EmptyState } from "@/components/shared/states";
import { OrgSwitcher } from "@/components/cloud/work-ui";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ORG_ROLE_DESCRIPTIONS,
  ORG_ROLE_TO_ROLE_NAME,
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from "@/lib/permissions";
import { useActiveOrg } from "@/hooks/use-active-org";
import { ORG_ROLES, useMyMembership, useOrgMembers } from "@/hooks/use-cloud";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  head: () => ({
    meta: [
      { title: "Roles & Permissions — Project CRM" },
      { name: "description", content: "See which workspace role grants which permissions, and who holds each role." },
      { property: "og:title", content: "Roles & Permissions — Project CRM" },
      { property: "og:description", content: "Live role definitions and the permission matrix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RolesPage,
});

function RolesPage() {
  const { orgs, activeOrgId, setOrgId } = useActiveOrg();
  const { data: members = [] } = useOrgMembers(activeOrgId);
  const { data: membership } = useMyMembership(activeOrgId);

  return (
    <PermissionGuard permission="user.manage" mode="page">
      <div className="mx-auto max-w-[1500px]">
        <PageHeader
          title="Roles & permissions"
          description="Every person's access comes from their workspace role — this is exactly what each role allows."
          actions={<OrgSwitcher orgs={orgs} value={activeOrgId} onChange={setOrgId} />}
        />

        {!activeOrgId ? (
          <EmptyState
            title="No workspace yet"
            description="Create an organization from Workspace Admin to see live roles."
          />
        ) : (
          <Tabs defaultValue="roles">
            <TabsList>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="matrix">Permission matrix</TabsTrigger>
            </TabsList>

            <TabsContent value="roles" className="mt-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {ORG_ROLES.map((role) => {
                  const holders = members.filter((m) => m.role === role);
                  const roleName = ORG_ROLE_TO_ROLE_NAME[role];
                  const granted = ROLE_PERMISSIONS[roleName] ?? [];
                  return (
                    <article key={role} className="surface-card p-5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold">{roleName}</h3>
                        {membership?.role === role ? <Badge>You</Badge> : <Badge variant="secondary">{role}</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{ORG_ROLE_DESCRIPTIONS[role]}</p>
                      <p className="mt-3 text-xs text-muted-foreground">{granted.length} permissions granted</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {holders.length} {holders.length === 1 ? "person" : "people"}
                      </p>
                      {holders.length ? (
                        <ul className="mt-2 space-y-1 text-xs">
                          {holders.slice(0, 5).map((m) => (
                            <li key={m.id} className="truncate">
                              {m.profile?.full_name || m.profile?.email || "Member"}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="matrix" className="mt-4">
              <div className="surface-card overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b bg-surface-muted/60 text-left">
                      <th className="sticky left-0 bg-surface-muted/60 px-4 py-2.5 font-medium">Permission</th>
                      {ORG_ROLES.map((role) => (
                        <th key={role} className="px-3 py-2.5 text-center text-xs font-medium">
                          {ORG_ROLE_TO_ROLE_NAME[role]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSIONS.map((p) => (
                      <tr key={p} className="border-b last:border-0">
                        <td className="sticky left-0 bg-card px-4 py-2 font-mono text-xs">{p}</td>
                        {ORG_ROLES.map((role) => {
                          const granted = ROLE_PERMISSIONS[ORG_ROLE_TO_ROLE_NAME[role]] ?? [];
                          return (
                            <td key={role} className="px-3 py-2 text-center">
                              {granted.includes(p) ? (
                                <Check className="mx-auto size-4 text-success" />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PermissionGuard>
  );
}
