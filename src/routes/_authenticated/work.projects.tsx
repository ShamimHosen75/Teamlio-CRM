import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState, SkeletonGrid } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CreateProjectDrawer,
  CreateTaskDrawer,
  LiveProjectCard,
  LiveTaskRow,
  OrgSwitcher,
  prettyStatus,
} from "@/components/cloud/work-ui";
import { useActiveOrg } from "@/hooks/use-active-org";
import {
  PROJECT_STATUSES,
  useOrgMembers,
  useOrgProjects,
  useOrgTasks,
  useSession,
} from "@/hooks/use-cloud";

export const Route = createFileRoute("/_authenticated/work/projects")({
  head: () => ({
    meta: [
      { title: "Live Projects — Project CRM" },
      { name: "description", content: "Your real projects with categories, owners, progress and workflow statuses." },
      { property: "og:title", content: "Live Projects — Project CRM" },
      { property: "og:description", content: "Create and update real projects stored in your workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveProjectsPage,
});

function LiveProjectsPage() {
  const { user } = useSession();
  const { orgs, activeOrg, activeOrgId, setOrgId, isLoading } = useActiveOrg();
  const { data: members = [] } = useOrgMembers(activeOrgId);
  const { data: projects = [], isLoading: projectsLoading } = useOrgProjects(activeOrgId);
  const { data: tasks = [] } = useOrgTasks(activeOrgId);
  const [status, setStatus] = useState("all");

  const myRole = useMemo(() => members.find((m) => m.user_id === user?.id)?.role, [members, user]);
  const canManage = activeOrg?.owner_id === user?.id || ["owner", "admin", "manager"].includes(myRole || "") || (!myRole && !!user);
  const rows = projects.filter((p) => status === "all" || p.status === status);
  const activeCount = projects.filter((p) => p.status === "in_progress").length;
  const completedCount = projects.filter((p) => p.status === "completed").length;

  return (
    <>
      <PageHeader
        title="Live projects"
        description="Real projects from your workspace — the same records the admin dashboard counts."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <OrgSwitcher orgs={orgs} value={activeOrgId} onChange={setOrgId} />
            {canManage ? <CreateProjectDrawer organizationId={activeOrgId} members={members} /> : null}
            {canManage ? (
              <CreateTaskDrawer organizationId={activeOrgId} members={members} projects={projects} variant="outline" />
            ) : null}
          </div>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      ) : !activeOrg ? (
        <EmptyState
          icon={Building2}
          title="No organization yet"
          description="Create your first organization in Workspace Admin to start adding real projects."
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Projects" value={projects.length} icon={FolderKanban} loading={projectsLoading} hint={activeOrg.name} />
            <StatCard label="In progress" value={activeCount} icon={FolderKanban} loading={projectsLoading} />
            <StatCard label="Completed" value={completedCount} icon={FolderKanban} loading={projectsLoading} />
            <StatCard label="Tasks" value={tasks.length} icon={FolderKanban} loading={projectsLoading} hint="across all projects" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-[190px]" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{prettyStatus(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild variant="ghost" size="sm">
              <Link to="/work/tasks">View all tasks</Link>
            </Button>
          </div>

          {projectsLoading ? (
            <SkeletonGrid />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title={projects.length ? "No projects with this status" : "No projects yet"}
              description={projects.length ? "Try another status filter." : "Create a project to start tracking live work."}
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {rows.map((project) => {
                const projectTasks = tasks.filter((t) => t.project_id === project.id);
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
                          {projectTasks.slice(0, 4).map((task) => (
                            <LiveTaskRow key={task.id} task={task} projectName={project.name} members={members} />
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-4 border-t pt-4 text-xs text-muted-foreground">No tasks on this project yet.</p>
                      )
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
