import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLeaveRequests, useMeetings, useTasks } from "@/hooks/use-data";
import { userName } from "@/components/shared/user-avatar";
import { useWorkspaceIntegrations } from "@/lib/integrations/use-integrations";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Teamlio" },
      { name: "description", content: "Tasks, meetings and approved leave on one unified calendar." },
      { property: "og:title", content: "Calendar — Teamlio" },
      { property: "og:description", content: "Unified calendar of tasks, meetings and leave." },
    ],
  }),
  component: CalendarPage,
});

type Layer = "tasks" | "meetings" | "leave";

function CalendarPage() {
  const { integrations } = useWorkspaceIntegrations();
  const calState = integrations.calendar;
  const [cursor, setCursor] = useState(new Date());
  const [layers, setLayers] = useState<Layer[]>(["tasks", "meetings", "leave"]);
  const { data: tasks = [] } = useTasks();
  const { data: meetings = [] } = useMeetings();
  const { data: leave = [] } = useLeaveRequests();

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  });

  const eventsFor = (day: Date) => {
    const out: { id: string; label: string; tone: string }[] = [];
    if (layers.includes("tasks")) {
      tasks
        .filter((t) => t.due_date && isSameDay(parseISO(t.due_date), day))
        .forEach((t) => out.push({ id: t.id, label: t.title, tone: "bg-primary-soft text-primary" }));
    }
    if (layers.includes("meetings")) {
      meetings
        .filter((m) => m.date && isSameDay(parseISO(m.date), day))
        .forEach((m) => out.push({ id: m.id, label: `${m.start_time} ${m.title}`, tone: "bg-info/10 text-info" }));
    }
    if (layers.includes("leave")) {
      leave
        .filter((l) => l.status === "Approved" && parseISO(l.start_date) <= day && parseISO(l.end_date) >= day)
        .forEach((l) => out.push({ id: l.id + day.toISOString(), label: `${userName(l.user_id)} on leave`, tone: "bg-warning/15 text-warning-foreground" }));
    }
    return out;
  };

  const toggle = (layer: Layer) =>
    setLayers((l) => (l.includes(layer) ? l.filter((x) => x !== layer) : [...l, layer]));

  return (
    <PermissionGuard permission="task.read" mode="page">
      <div className="mx-auto max-w-[1600px]">
        <PageHeader
          title="Calendar"
          description="Task due dates, meetings and approved leave in a single view."
          actions={
            <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
              {calState?.connected ? (
                <Badge
                  variant="outline"
                  className="gap-1.5 py-1 px-2.5 bg-rose-500/10 text-rose-400 border-rose-500/30 text-xs font-medium"
                >
                  <span className="size-1.5 rounded-full bg-rose-400 animate-pulse" />
                  <span>{calState.config.provider === "google" ? "Google Calendar" : "Outlook"} Synced</span>
                </Badge>
              ) : null}
              {(["tasks", "meetings", "leave"] as Layer[]).map((l) => (
                <label key={l} className="flex items-center gap-1.5 text-sm capitalize">
                  <Checkbox checked={layers.includes(l)} onCheckedChange={() => toggle(l)} /> {l}
                </label>
              ))}
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => setCursor(addMonths(cursor, -1))} aria-label="Previous month">
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="min-w-0 text-center text-sm font-medium sm:min-w-[8.5rem]">{format(cursor, "MMMM yyyy")}</span>
                <Button variant="outline" size="icon" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="Next month">
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          }
        />

        <div className="surface-card max-w-full overflow-x-auto overscroll-x-contain">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 border-b bg-surface-muted/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="px-2 py-2 text-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const events = eventsFor(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[104px] border-b border-r p-1.5 last:border-r-0",
                      !isSameMonth(day, cursor) && "bg-surface-muted/40 text-muted-foreground",
                    )}
                  >
                    <p className={cn("mb-1 text-xs font-medium", isSameDay(day, new Date()) && "inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground")}>
                      {format(day, "d")}
                    </p>
                    <div className="space-y-1">
                      {events.slice(0, 3).map((e) => (
                        <p key={e.id} className={cn("truncate rounded px-1.5 py-0.5 text-[11px]", e.tone)}>
                          {e.label}
                        </p>
                      ))}
                      {events.length > 3 ? <p className="text-[11px] text-muted-foreground">+{events.length - 3} more</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
