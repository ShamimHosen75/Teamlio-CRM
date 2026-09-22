import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Video } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { FormDrawer } from "@/components/shared/form-drawer";
import { StatusBadge } from "@/components/shared/badges";
import { UserAvatarGroup } from "@/components/shared/user-avatar";
import { EmptyState, SkeletonTable } from "@/components/shared/states";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate } from "@/lib/format";
import { useCreateMeeting, useMeetings } from "@/hooks/use-data";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meetings — Teamlio" },
      { name: "description", content: "Internal, project, client and sales meetings with agendas and notes." },
      { property: "og:title", content: "Meetings — Teamlio" },
      { property: "og:description", content: "Meetings with agendas, participants and notes." },
    ],
  }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const { data: meetings = [], isLoading } = useMeetings();
  const [type, setType] = useState("all");
  const rows = meetings.filter((m) => type === "all" || m.type === type);

  return (
    <PermissionGuard permission="meeting.manage" mode="page">
      <div className="mx-auto max-w-[1400px]">
        <PageHeader
          title="Meetings"
          description="Every scheduled conversation, with agenda and outcome notes."
          actions={<ScheduleDrawer />}
        />
        <div className="mb-4">
          <FilterBar
            filters={[{ key: "type", label: "Type", options: ["Internal", "Project", "Client", "Sales"], value: type, onChange: setType }]}
          />
        </div>
        {isLoading ? (
          <SkeletonTable />
        ) : rows.length === 0 ? (
          <EmptyState title="No meetings scheduled" description="Schedule a meeting to see it here." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((m) => (
              <article key={m.id} className="surface-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">{m.title}</h3>
                    <p className="text-xs text-muted-foreground">{m.type} meeting</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
                <p className="mt-3 text-sm">{fmtDate(m.date)} · {m.start_time}–{m.end_time}</p>
                <p className="mt-1 text-xs text-muted-foreground">{m.location || "Online"}</p>
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{m.agenda}</p>
                <div className="mt-4 flex items-center justify-between">
                  <UserAvatarGroup userIds={m.participant_ids} max={4} />
                  <Button variant="outline" size="sm" onClick={() => toast.info("Meeting link copied")}>
                    <Video className="size-4" /> Join
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

function ScheduleDrawer() {
  const createMeeting = useCreateMeeting();
  const [form, setForm] = useState({ title: "", type: "Internal", date: "", start: "09:00", end: "10:00", agenda: "" });
  const [error, setError] = useState("");

  return (
    <FormDrawer
      trigger={<Button size="sm"><Plus className="size-4" /> Schedule meeting</Button>}
      title="Schedule a meeting"
      submitLabel="Schedule"
      onSubmit={() => {
        if (!form.title.trim() || !form.date) {
          setError("A title and date are required.");
          return false;
        }
        createMeeting.mutate(
          {
            title: form.title.trim(),
            type: form.type as never,
            date: form.date,
            start_time: form.start || "09:00",
            end_time: form.end || "10:00",
            agenda: form.agenda.trim(),
          },
          {
            onSuccess: () => {
              toast.success(`${form.title} scheduled`);
              setForm({ title: "", type: "Internal", date: "", start: "09:00", end: "10:00", agenda: "" });
              setError("");
            },
            onError: (err) => {
              toast.error(err instanceof Error ? err.message : "Failed to schedule meeting");
            },
          },
        );
        return true;
      }}
    >
      <div className="space-y-4">
        {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        <div className="space-y-1.5">
          <Label htmlFor="m-title">Title</Label>
          <Input id="m-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="m-date">Date</Label>
            <Input id="m-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-start">Start</Label>
            <Input id="m-start" type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-end">End</Label>
            <Input id="m-end" type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-agenda">Agenda</Label>
          <Textarea id="m-agenda" rows={4} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} />
        </div>
      </div>
    </FormDrawer>
  );
}
