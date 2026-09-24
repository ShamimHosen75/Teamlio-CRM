import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Clock, Plus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { FormDrawer } from "@/components/shared/form-drawer";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { SkeletonGrid } from "@/components/shared/states";
import { UserAvatarGroup, UserCell, userName } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useTeamMembers,
  useTeams,
  useUsers,
  useTeamMemberRequests,
  useReviewTeamMemberRequest,
} from "@/hooks/use-data";
import { useWorkspace } from "@/app/workspace";
import { fromNow } from "@/lib/format";

export const Route = createFileRoute("/admin/teams")({
  head: () => ({
    meta: [
      { title: "Teams Management — Teamlio" },
      { name: "description", content: "Create teams, set leads and manage membership." },
      { property: "og:title", content: "Teams Management — Teamlio" },
      { property: "og:description", content: "Team structure, leads and membership." },
    ],
  }),
  component: AdminTeamsPage,
});

function AdminTeamsPage() {
  const { data: teams = [], isLoading } = useTeams();
  const { data: requests = [] } = useTeamMemberRequests();
  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <PermissionGuard permission="team.manage" mode="page">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <PageHeader
          title="Teams management"
          description="How the organisation is grouped for delivery."
          actions={<NewTeamDrawer />}
        />

        {pendingRequests.length > 0 ? (
          <TeamMemberRequestsPanel requests={pendingRequests} teams={teams} />
        ) : null}

        {isLoading ? (
          <SkeletonGrid />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {teams.map((t) => (
              <TeamCard key={t.id} teamId={t.id} name={t.name} description={t.description} leadId={t.lead_user_id} />
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

function TeamMemberRequestsPanel({
  requests,
  teams,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requests: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  teams: any[];
}) {
  const { currentUser, roleName } = useWorkspace();
  const reviewMutation = useReviewTeamMemberRequest();

  const canApprove =
    roleName === "Organization Owner" ||
    roleName === "Admin" ||
    roleName === "Project Manager" ||
    roleName === "Team Lead";

  function handleApprove(requestId: string) {
    reviewMutation.mutate(
      { id: requestId, status: "approved", reviewerId: currentUser.id },
      {
        onSuccess: () => toast.success("Team member request approved! Member added to the team."),
        onError: () => toast.error("Failed to approve request."),
      },
    );
  }

  function handleReject(requestId: string) {
    reviewMutation.mutate(
      { id: requestId, status: "rejected", reviewerId: currentUser.id },
      {
        onSuccess: () => toast.success("Team member request rejected."),
        onError: () => toast.error("Failed to reject request."),
      },
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-foreground">Pending Team Member Requests</h2>
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-500">
            {requests.length} awaiting approval
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Admins, Managers & Owners can approve new team members.
        </p>
      </div>

      <div className="divide-y rounded-lg border bg-surface">
        {requests.map((r) => {
          const team = teams.find((t) => t.id === r.team_id);
          return (
            <div key={r.id} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <UserCell userId={r.user_id} subtitle={r.role_in_team || "Team Member"} />
                  <span className="text-xs text-muted-foreground">requested to join</span>
                  <Badge variant="secondary" className="font-semibold">
                    {team?.name ?? "Team"}
                  </Badge>
                </div>
                {r.message ? (
                  <p className="pl-10 text-xs italic text-muted-foreground">"{r.message}"</p>
                ) : null}
                <p className="pl-10 text-[11px] text-muted-foreground">
                  Submitted {fromNow(r.created_at)}
                </p>
              </div>

              {canApprove ? (
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    disabled={reviewMutation.isPending}
                    onClick={() => handleApprove(r.id)}
                  >
                    <Check className="mr-1 size-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    disabled={reviewMutation.isPending}
                    onClick={() => handleReject(r.id)}
                  >
                    <X className="mr-1 size-3.5" /> Reject
                  </Button>
                </div>
              ) : (
                <Badge variant="outline">Requires Manager/Admin Approval</Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamCard({
  teamId,
  name,
  description,
  leadId,
}: {
  teamId: string;
  name: string;
  description: string;
  leadId: string;
}) {
  const { data: members = [] } = useTeamMembers(teamId);
  const { data: requests = [] } = useTeamMemberRequests(teamId);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <article className="surface-card p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">{name}</h3>
        {pendingCount > 0 ? (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-500 text-[10px]">
            {pendingCount} request{pendingCount > 1 ? "s" : ""}
          </Badge>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <p className="mt-3 text-xs text-muted-foreground">Lead · {userName(leadId)}</p>
      <div className="mt-4 flex items-center justify-between">
        <UserAvatarGroup userIds={members.map((m) => m.user.id)} max={5} />
        <Button variant="ghost" size="sm" asChild>
          <Link to="/teams/$teamId" params={{ teamId }}>Open</Link>
        </Button>
      </div>
    </article>
  );
}

function NewTeamDrawer() {
  const { data: users = [] } = useUsers();
  const [form, setForm] = useState({ name: "", description: "", lead: "" });
  const [error, setError] = useState("");

  return (
    <FormDrawer
      trigger={<Button size="sm"><Plus className="size-4" /> New team</Button>}
      title="Create a team"
      submitLabel="Create team"
      onSubmit={() => {
        if (!form.name.trim()) {
          setError("Give the team a name.");
          return false;
        }
        toast.success(`${form.name} created`);
        setForm({ name: "", description: "", lead: "" });
        setError("");
        return true;
      }}
    >
      <div className="space-y-4">
        {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        <div className="space-y-1.5">
          <Label htmlFor="team-name">Team name</Label>
          <Input id="team-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="team-desc">Description</Label>
          <Textarea id="team-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Team lead</Label>
          <Select value={form.lead} onValueChange={(v) => setForm({ ...form, lead: v })}>
            <SelectTrigger><SelectValue placeholder="Select a lead" /></SelectTrigger>
            <SelectContent>
              {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </FormDrawer>
  );
}
