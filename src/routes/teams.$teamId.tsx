import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Clock, UserPlus, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState, SkeletonCard } from "@/components/shared/states";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { UserCell, userName } from "@/components/shared/user-avatar";
import { StatusBadge } from "@/components/shared/badges";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fmtDate, fromNow } from "@/lib/format";
import {
  useLeaveRequests,
  useTasks,
  useTeamMembers,
  useTeams,
  useTeamMemberRequests,
  useCreateTeamMemberRequest,
  useReviewTeamMemberRequest,
} from "@/hooks/use-data";
import { useWorkspace } from "@/app/workspace";
import { toast } from "sonner";

export const Route = createFileRoute("/teams/$teamId")({
  head: () => ({
    meta: [
      { title: "Team detail — Teamlio" },
      { name: "description", content: "Members, workload and availability for a single delivery team." },
      { property: "og:title", content: "Team detail — Teamlio" },
      { property: "og:description", content: "Team members, workload and availability." },
    ],
  }),
  component: TeamDetailPage,
});

function TeamDetailPage() {
  const { teamId } = Route.useParams();
  const { currentUser, roleName } = useWorkspace();
  const { data: teams = [], isLoading } = useTeams();
  const { data: members = [] } = useTeamMembers(teamId);
  const { data: tasks = [] } = useTasks();
  const { data: leave = [] } = useLeaveRequests();
  const { data: requests = [] } = useTeamMemberRequests(teamId);

  const reviewMutation = useReviewTeamMemberRequest();

  if (isLoading) return <SkeletonCard lines={5} />;
  const team = teams.find((t) => t.id === teamId);
  if (!team) return <EmptyState title="Team not found" description="This team may have been disbanded." />;

  const teamTasks = tasks.filter((t) => t.team_id === team.id);
  const open = teamTasks.filter((t) => t.status !== "Completed");

  // Admin, Manager, and Owner (plus team lead) can approve team member requests
  const canApprove =
    roleName === "Organization Owner" ||
    roleName === "Admin" ||
    roleName === "Project Manager" ||
    roleName === "Team Lead" ||
    team.lead_user_id === currentUser.id;

  const isMember = members.some((m) => m.user.id === currentUser.id);
  const myPendingRequest = requests.find((r) => r.user_id === currentUser.id && r.status === "pending");
  const pendingRequests = requests.filter((r) => r.status === "pending");

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
    <PermissionGuard permission="team.read" mode="page">
      <div className="mx-auto max-w-[1400px]">
        <Link to="/teams" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All teams
        </Link>
        <PageHeader
          title={team.name}
          description={`${team.description} · Led by ${userName(team.lead_user_id)}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {!isMember && !myPendingRequest ? (
                <RequestJoinDialog teamId={teamId} teamName={team.name} currentUserId={currentUser.id} />
              ) : !isMember && myPendingRequest ? (
                <Badge variant="outline" className="flex items-center gap-1.5 border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-500">
                  <Clock className="size-3.5" /> Request Pending Approval
                </Badge>
              ) : null}
              <StatusBadge status={team.status} />
            </div>
          }
        />

        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Members" value={members.length} />
          <StatCard
            label="Pending requests"
            value={pendingRequests.length}
            tone={pendingRequests.length > 0 ? "warning" : undefined}
          />
          <StatCard label="Open tasks" value={open.length} />
          <StatCard label="Completed tasks" value={teamTasks.length - open.length} tone="success" />
        </div>

        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
            <TabsTrigger value="requests" className="relative">
              Join Requests
              {pendingRequests.length > 0 ? (
                <span className="ml-1.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {pendingRequests.length}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="workload">Workload</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-4 surface-card divide-y">
            {members.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No active members in this team yet.
              </div>
            ) : (
              members.map((m) => (
                <div key={m.user.id} className="flex items-center justify-between px-4 py-3">
                  <UserCell userId={m.user.id} subtitle={m.role_in_team} />
                  <StatusBadge status={m.user.status} />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-4 surface-card divide-y">
            {requests.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No team join requests yet.
              </div>
            ) : (
              requests.map((r) => (
                <div key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <UserCell userId={r.user_id} subtitle={r.role_in_team || "Team Member"} />
                      <Badge
                        variant="outline"
                        className={
                          r.status === "approved"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                            : r.status === "rejected"
                            ? "border-destructive/30 bg-destructive/10 text-destructive"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-500"
                        }
                      >
                        {r.status === "pending" ? "Pending Approval" : r.status.toUpperCase()}
                      </Badge>
                    </div>
                    {r.message ? (
                      <p className="pl-10 text-xs text-muted-foreground">"{r.message}"</p>
                    ) : null}
                    <p className="pl-10 text-[11px] text-muted-foreground">
                      Requested {fromNow(r.created_at)}
                      {r.reviewed_by ? ` · Reviewed by ${userName(r.reviewed_by)}` : ""}
                    </p>
                  </div>

                  {r.status === "pending" && canApprove ? (
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
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={reviewMutation.isPending}
                        onClick={() => handleReject(r.id)}
                      >
                        <X className="mr-1 size-3.5" /> Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="workload" className="mt-4 surface-card space-y-4 p-4">
            {members.map((m) => {
              const count = tasks.filter((t) => t.assignee_ids.includes(m.user.id) && t.status !== "Completed").length;
              return (
                <div key={m.user.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <UserCell userId={m.user.id} />
                    <span className="text-sm font-medium">{count} open</span>
                  </div>
                  <Progress value={Math.min(100, count * 12)} className="h-1.5" />
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="availability" className="mt-4 surface-card divide-y">
            {leave.slice(0, 8).map((l) => (
              <div key={l.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{userName(l.user_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.leave_type} · {fmtDate(l.start_date)} → {fmtDate(l.end_date)}
                  </p>
                </div>
                <StatusBadge status={l.status} />
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}

function RequestJoinDialog({
  teamId,
  teamName,
  currentUserId,
}: {
  teamId: string;
  teamName: string;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [roleInTeam, setRoleInTeam] = useState("Member");
  const [message, setMessage] = useState("");
  const createRequest = useCreateTeamMemberRequest();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createRequest.mutate(
      {
        team_id: teamId,
        user_id: currentUserId,
        role_in_team: roleInTeam.trim() || "Member",
        message: message.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Request submitted! An Admin, Manager, or Owner will review it.");
          setOpen(false);
          setMessage("");
        },
        onError: () => {
          toast.error("Failed to submit request.");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <UserPlus className="size-4" /> Request to Join Team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Join {teamName}</DialogTitle>
            <DialogDescription>
              Submit a request to join this team. An administrator, project manager, or team lead must approve your request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="role-in-team">Desired role in team</Label>
              <Input
                id="role-in-team"
                value={roleInTeam}
                onChange={(e) => setRoleInTeam(e.target.value)}
                placeholder="e.g. Frontend Developer, QA Engineer, Designer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="request-message">Note / Message (optional)</Label>
              <Textarea
                id="request-message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain why you'd like to join or what you'll be working on..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createRequest.isPending}>
              {createRequest.isPending ? "Submitting..." : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
