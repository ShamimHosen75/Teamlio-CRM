import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Building2, FolderKanban, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDrawer } from "@/components/shared/form-drawer";
import { MetricChart } from "@/components/shared/metric-chart";
import {
  CreateProjectDrawer,
  CreateTaskDrawer,
  LiveProjectCard,
  LiveTaskRow,
} from "@/components/cloud/work-ui";
import { useActiveOrg } from "@/hooks/use-active-org";
import {
  ORG_ROLES,
  PROJECT_STATUSES,
  useCancelInvite,
  useCreateOrganization,
  useCreateTeam,
  useDeleteTeam,
  useInviteMember,
  useOrgInvites,
  useOrgMembers,
  useOrgProjects,
  useOrgTasks,
  useOrgTeams,
  useRemoveMember,
  useSetTeamMember,
  useSession,
  useUpdateMember,
  type CloudMember,
  type CloudProject,
  type CloudTask,
  type OrgRole,
} from "@/hooks/use-cloud";

export const Route = createFileRoute("/_authenticated/admin/workspace")({
  head: () => ({
    meta: [
      { title: "Live Admin Dashboard — Project CRM" },
      {
        name: "description",
        content: "Create your own organizations, invite real users and build teams on live data.",
      },
      { property: "og:title", content: "Live Admin Dashboard — Project CRM" },
      { property: "og:description", content: "Manage live organizations, users and teams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkspaceAdminPage,
});

function WorkspaceAdminPage() {
  const { user } = useSession();
  const { orgs, isLoading, activeOrg, activeOrgId, setOrgId } = useActiveOrg();

  const { data: members = [] } = useOrgMembers(activeOrgId);
  const { data: invites = [] } = useOrgInvites(activeOrgId);
  const { data: teams = [] } = useOrgTeams(activeOrgId);
  const { data: projects = [], isLoading: projectsLoading } = useOrgProjects(activeOrgId);
  const { data: tasks = [], isLoading: tasksLoading } = useOrgTasks(activeOrgId);

  const createOrg = useCreateOrganization();
  const myRole = useMemo<OrgRole | undefined>(
    () => members.find((m) => m.user_id === user?.id)?.role,
    [members, user],
  );
  const canManage = activeOrg?.owner_id === user?.id || myRole === "owner" || myRole === "admin";
  const pendingInvites = invites.filter((i) => !i.accepted_at);

  return (
    <>
      <PageHeader
        title="Workspace Admin"
        description="Your live workspace — create organizations, invite real people and build teams."
        actions={
           <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            {orgs.length > 0 ? (
              <Select value={activeOrgId} onValueChange={setOrgId}>
                 <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <CreateOrgDrawer
              onCreate={async (name) => {
                try {
                  const org = await createOrg.mutateAsync(name);
                  setOrgId(org.id);
                  toast.success(`${org.name} created`);
                  return true;
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not create organization");
                  return false;
                }
              }}
            />
          </div>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      ) : !activeOrg ? (
        <EmptyState
          icon={Building2}
          title="No organization yet"
          description="Create your first organization to start adding real users and teams."
        />
      ) : (
        <div className="space-y-6">
          <Tabs defaultValue="overview">
             <TabsList className="w-full max-w-full overflow-x-auto sm:w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="members">Users</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="organization">Organization</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-5">
              <OverviewPanel
                organizationCount={orgs.length}
                members={members}
                teams={teams}
                projects={projects}
                tasks={tasks}
                loading={projectsLoading || tasksLoading}
              />
            </TabsContent>

            <TabsContent value="members" className="mt-5 space-y-5">
              <MembersPanel
                organizationId={activeOrg.id}
                canManage={canManage}
                members={members}
                invites={pendingInvites}
                currentUserId={user?.id}
              />
            </TabsContent>

            <TabsContent value="teams" className="mt-5">
              <TeamsPanel
                organizationId={activeOrg.id}
                canManage={canManage}
                teams={teams}
                members={members}
              />
            </TabsContent>

            <TabsContent value="projects" className="mt-5">
              <ProjectsPanel
                organizationId={activeOrg.id}
                canManage={canManage}
                members={members}
                projects={projects}
                tasks={tasks}
              />
            </TabsContent>

            <TabsContent value="organization" className="mt-5">
              <div className="surface-card max-w-xl space-y-3 p-5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{activeOrg.name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Identifier</span>
                  <span className="font-mono text-xs">{activeOrg.slug}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Your access</span>
                  <Badge variant="secondary">{myRole ?? "member"}</Badge>
                </div>
                <p className="pt-2 text-xs text-muted-foreground">
                  Organizations, users, teams, projects, and tasks on this page are stored in your live database.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </>
  );
}

function CreateOrgDrawer({ onCreate }: { onCreate: (name: string) => Promise<boolean> }) {
  const [name, setName] = useState("");
  return (
    <FormDrawer
      trigger={
        <Button size="sm">
          <Plus className="size-4" /> New organization
        </Button>
      }
      title="Create organization"
      description="You become the owner and can invite people right away."
      submitLabel="Create"
      onSubmit={async () => {
        if (!name.trim()) {
          toast.error("Enter an organization name");
          return false;
        }
        const ok = await onCreate(name.trim());
        if (ok) setName("");
        return ok;
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="org-name">Organization name</Label>
        <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Digital" />
      </div>
    </FormDrawer>
  );
}

function MembersPanel({
  organizationId,
  canManage,
  members,
  invites,
  currentUserId,
}: {
  organizationId: string;
  canManage: boolean;
  members: ReturnType<typeof useOrgMembers>["data"] extends infer T ? NonNullable<T> : never;
  invites: NonNullable<ReturnType<typeof useOrgInvites>["data"]>;
  currentUserId: string | undefined;
}) {
  const invite = useInviteMember(organizationId);
  const cancelInvite = useCancelInvite();
  const updateMember = useUpdateMember();
  const removeMember = useRemoveMember();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("member");
  const [jobTitle, setJobTitle] = useState("");

  return (
    <>
      <div className="surface-card overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold">Members</h2>
          {canManage ? (
            <FormDrawer
              trigger={
                <Button size="sm" variant="outline">
                  <Plus className="size-4" /> Invite user
                </Button>
              }
              title="Invite a user"
              description="They join this organization automatically as soon as they sign up with this email."
              submitLabel="Send invite"
              onSubmit={async () => {
                if (!email.includes("@")) {
                  toast.error("Enter a valid email address");
                  return false;
                }
                try {
                  const res = (await invite.mutateAsync({ email, role, job_title: jobTitle })) as {
                    emailSent?: boolean;
                    alreadyRegistered?: boolean;
                    message?: string;
                  } | undefined;

                  if (res?.emailSent) {
                    toast.success(`Activation email sent to ${email}!`);
                  } else if (res?.alreadyRegistered) {
                    toast.success(res.message || "User added to workspace!");
                  } else {
                    toast.success(res?.message || `Invite created for ${email}`);
                  }
                  setEmail("");
                  setJobTitle("");
                  return true;
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not create the invite");
                  return false;
                }
              }}
            >
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-title">Job title</Label>
                  <Input id="invite-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Project Manager" />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormDrawer>
          ) : null}
        </div>
        <ul className="divide-y">
          {members.map((m) => (
            <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:flex-wrap sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.profile?.full_name || m.profile?.email || "Pending profile"}
                  {m.user_id === currentUserId ? <span className="ml-2 text-xs text-muted-foreground">(you)</span> : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.profile?.email} {m.job_title ? `· ${m.job_title}` : ""}
                </p>
              </div>
              {canManage && m.role !== "owner" ? (
                <Select
                  value={m.role}
                  onValueChange={(v) => updateMember.mutate({ id: m.id, role: v as OrgRole })}
                >
                  <SelectTrigger className="h-8 w-32">
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
                <Badge variant="secondary">{m.role}</Badge>
              )}
              {canManage && m.role !== "owner" ? (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove member"
                  onClick={() => removeMember.mutate(m.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="border-b px-5 py-3">
          <h2 className="text-sm font-semibold">Pending invites</h2>
        </div>
        {invites.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">No pending invites.</p>
        ) : (
          <ul className="divide-y">
            {invites.map((i) => (
               <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.email}</p>
                  <p className="text-xs text-muted-foreground">Will join as {i.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const link = `${window.location.origin}/auth?mode=signup&email=${encodeURIComponent(i.email)}`;
                      navigator.clipboard.writeText(link);
                      toast.success(`Activation link copied for ${i.email}!`);
                    }}
                  >
                    Copy link
                  </Button>
                  {canManage ? (
                    <Button size="sm" variant="ghost" onClick={() => cancelInvite.mutate(i.id)}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function TeamsPanel({
  organizationId,
  canManage,
  teams,
  members,
}: {
  organizationId: string;
  canManage: boolean;
  teams: NonNullable<ReturnType<typeof useOrgTeams>["data"]>;
  members: NonNullable<ReturnType<typeof useOrgMembers>["data"]>;
}) {
  const createTeam = useCreateTeam(organizationId);
  const deleteTeam = useDeleteTeam();
  const setTeamMember = useSetTeamMember();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leadId, setLeadId] = useState<string>("none");

  const memberName = (userId: string) =>
    members.find((m) => m.user_id === userId)?.profile?.full_name ?? "Member";

  return (
    <div className="space-y-5">
      {canManage ? (
        <FormDrawer
          trigger={
            <Button size="sm">
              <Plus className="size-4" /> New team
            </Button>
          }
          title="Create team"
          submitLabel="Create team"
          onSubmit={async () => {
            if (!name.trim()) {
              toast.error("Enter a team name");
              return false;
            }
            try {
              await createTeam.mutateAsync({
                name: name.trim(),
                description: description.trim(),
                lead_id: leadId === "none" ? null : leadId,
              });
              toast.success("Team created");
              setName("");
              setDescription("");
              setLeadId("none");
              return true;
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not create the team");
              return false;
            }
          }}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="team-name">Team name</Label>
              <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Development" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="team-desc">Description</Label>
              <Textarea id="team-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Team lead</Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="No lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No lead</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profile?.full_name || m.profile?.email || "Member"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FormDrawer>
      ) : null}

      {teams.length === 0 ? (
        <EmptyState icon={Users} title="No teams yet" description="Create a team and add members from your organization." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {teams.map((t) => (
            <article key={t.id} className="surface-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{t.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{t.description || "No description"}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Lead · {t.lead_id ? memberName(t.lead_id) : "Unassigned"}
                  </p>
                </div>
                {canManage ? (
                  <Button size="icon" variant="ghost" aria-label="Delete team" onClick={() => deleteTeam.mutate(t.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
              <div className="mt-4 space-y-2 border-t pt-4">
                <p className="text-xs font-medium text-muted-foreground">Members</p>
                {members.map((m) => {
                  const checked = t.team_members.some((tm) => tm.user_id === m.user_id);
                  return (
                    <label key={m.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        disabled={!canManage}
                        onCheckedChange={(v) =>
                          setTeamMember.mutate({ teamId: t.id, userId: m.user_id, add: v === true })
                        }
                      />
                      <span className="truncate">{m.profile?.full_name || m.profile?.email || "Member"}</span>
                    </label>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

const prettyStatus = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function OverviewPanel({
  organizationCount,
  members,
  teams,
  projects,
  tasks,
  loading,
}: {
  organizationCount: number;
  members: CloudMember[];
  teams: NonNullable<ReturnType<typeof useOrgTeams>["data"]>;
  projects: CloudProject[];
  tasks: CloudTask[];
  loading: boolean;
}) {
  const roleData = ORG_ROLES.map((role) => ({ name: prettyStatus(role), total: members.filter((m) => m.role === role).length }));
  const teamData = teams.map((team) => ({ name: team.name, members: team.team_members.length }));
  const statusData = PROJECT_STATUSES.map((status) => ({ name: prettyStatus(status), total: projects.filter((p) => p.status === status).length }));
  const recent = [
    ...projects.map((p) => ({ id: `project-${p.id}`, name: p.name, type: "Project", date: p.created_at })),
    ...tasks.map((t) => ({ id: `task-${t.id}`, name: t.title, type: "Task", date: t.created_at })),
    ...teams.map((t) => ({ id: `team-${t.id}`, name: t.name, type: "Team", date: t.created_at })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Organizations" value={organizationCount} icon={Building2} loading={loading} hint="available to you" />
        <StatCard label="Users" value={members.length} icon={Users} loading={loading} hint="selected organization" />
        <StatCard label="Teams" value={teams.length} icon={Users} loading={loading} hint="active groups" />
        <StatCard label="Projects" value={projects.length} icon={FolderKanban} loading={loading} hint={`${tasks.length} tasks`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartPanel title="Member roles"><MetricChart type="pie" data={roleData} xKey="name" series={[{ key: "total", label: "Members" }]} height={220} /></ChartPanel>
        <ChartPanel title="Team size"><MetricChart type="bar" data={teamData} xKey="name" series={[{ key: "members", label: "Members" }]} height={220} /></ChartPanel>
        <ChartPanel title="Project status"><MetricChart type="pie" data={statusData} xKey="name" series={[{ key: "total", label: "Projects" }]} height={220} /></ChartPanel>
      </div>
      <div className="surface-card overflow-hidden">
        <div className="flex items-center gap-2 border-b px-5 py-3"><Activity className="size-4 text-primary" /><h2 className="text-sm font-semibold">Recent activity</h2></div>
        {recent.length ? <ul className="divide-y">{recent.map((item) => <li key={item.id} className="flex items-center gap-3 px-5 py-3"><span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span><Badge variant="secondary">{item.type}</Badge><time className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString()}</time></li>)}</ul> : <p className="px-5 py-8 text-sm text-muted-foreground">New projects, tasks, and teams will appear here.</p>}
      </div>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="surface-card min-w-0 p-4"><h2 className="mb-1 text-sm font-semibold">{title}</h2>{children}</section>;
}

function ProjectsPanel({
  organizationId,
  canManage,
  members,
  projects,
  tasks,
}: {
  organizationId: string;
  canManage: boolean;
  members: CloudMember[];
  projects: CloudProject[];
  tasks: CloudTask[];
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {canManage ? <CreateProjectDrawer organizationId={organizationId} members={members} /> : null}
        {canManage ? (
          <CreateTaskDrawer organizationId={organizationId} members={members} projects={projects} variant="outline" />
        ) : null}
        <Button asChild variant="ghost" size="sm">
          <Link to="/work/projects">Open projects page</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/work/tasks">Open tasks page</Link>
        </Button>
      </div>
      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects yet" description="Create a project to start assigning and tracking live work." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {projects.map((project) => {
            const projectTasks = tasks.filter((task) => task.project_id === project.id);
            return (
              <LiveProjectCard
                key={project.id}
                project={project}
                tasks={tasks}
                members={members}
                canManage={canManage}
                footer={
                  projectTasks.length ? (
                    <ul className="mt-4 divide-y border-t">
                      {projectTasks.map((task) => (
                        <LiveTaskRow key={task.id} task={task} projectName={project.name} members={members} />
                      ))}
                    </ul>
                  ) : null
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
