import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import {
  Check,
  Code2,
  Headphones,
  Palette,
  Plus,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, SkeletonGrid } from "@/components/shared/states";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { UserAvatar, UserAvatarGroup, userName } from "@/components/shared/user-avatar";
import { StatusBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/app/workspace";
import { useCreateTeam, useTasks, useTeams, useUsers } from "@/hooks/use-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/teams/")({
  validateSearch: (search: Record<string, unknown>): { create?: boolean } => ({
    create: search.create ? search.create === "true" || search.create === true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Teams — Teamlio" },
      { name: "description", content: "Team structure, leads, capacity and current workload." },
      { property: "og:title", content: "Teams — Teamlio" },
      { property: "og:description", content: "Team structure, capacity and workload." },
    ],
  }),
  component: TeamsPage,
});

/** Preset templates specifically requested by the user */
const PRESET_TEMPLATES = [
  {
    name: "Web Development",
    tag: "Engineering",
    color: "#2563eb",
    icon: Code2,
    description: "Full-stack web engineering, React/Next.js frontend, REST/GraphQL APIs, backend services and cloud deployment.",
  },
  {
    name: "Digital Marketing",
    tag: "Growth",
    color: "#059669",
    icon: TrendingUp,
    description: "Search engine optimization (SEO), paid ad campaigns, social media growth, email marketing, and conversion funnel analytics.",
  },
  {
    name: "Graphics Design",
    tag: "Creative",
    color: "#7c3aed",
    icon: Palette,
    description: "UI/UX wireframes, branding guidelines, visual marketing assets, Figma design systems, presentation decks and social visuals.",
  },
  {
    name: "Video Editing",
    tag: "Media",
    color: "#ea580c",
    icon: Video,
    description: "Video post-production, motion graphics, YouTube and short-form video cutting, sound mixing, color grading and animated explainers.",
  },
  {
    name: "Mobile App Development",
    tag: "Engineering",
    color: "#0891b2",
    icon: Smartphone,
    description: "Native and cross-platform mobile apps for iOS and Android, App Store/Play Store deployments, and mobile backend integrations.",
  },
  {
    name: "Customer Support & Sales",
    tag: "Operations",
    color: "#e11d48",
    icon: Headphones,
    description: "Customer onboarding, live support inquiries, account management, lead qualification and client success.",
  },
];

const COLOR_OPTIONS = [
  { label: "Blue", hex: "#2563eb" },
  { label: "Emerald", hex: "#059669" },
  { label: "Violet", hex: "#7c3aed" },
  { label: "Orange", hex: "#ea580c" },
  { label: "Cyan", hex: "#0891b2" },
  { label: "Rose", hex: "#e11d48" },
  { label: "Amber", hex: "#d97706" },
  { label: "Indigo", hex: "#4f46e5" },
  { label: "Teal", hex: "#0d9488" },
];

function TeamsPage() {
  const { create } = useSearch({ from: "/teams/" });
  const { data: teams = [], isLoading } = useTeams();
  const { data: tasks = [] } = useTasks();
  const { data: users = [] } = useUsers();
  const { can } = usePermissions();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (create || (typeof window !== "undefined" && window.location.search.includes("create=true"))) {
      setCreateDialogOpen(true);
    }
  }, [create]);

  return (
    <PermissionGuard permission="team.read" mode="page">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <PageHeader
          title="Teams"
          description="How delivery capacity is organised across the organisation."
          actions={
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="size-4" /> Create Team
            </Button>
          }
        />

        {isLoading ? (
          <SkeletonGrid />
        ) : teams.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No teams created yet"
            description="Organise your delivery capacity into dedicated functional teams such as Web Development, Digital Marketing, Graphics Design, Video Editing, or custom squads."
            action={
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="size-4" /> Create First Team
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {teams.map((t) => {
              const teamTasks = tasks.filter((task) => task.team_id === t.id);
              const openTasks = teamTasks.filter((task) => task.status !== "Completed").length;
              const load = teamTasks.length
                ? Math.round(((teamTasks.length - openTasks) / teamTasks.length) * 100)
                : 0;
              const teamColor = t.color || "#6366f1";

              return (
                <Link
                  key={t.id}
                  to="/teams/$teamId"
                  params={{ teamId: t.id }}
                  className="surface-card group relative overflow-hidden p-5 transition-all hover:border-primary/50 hover:shadow-raised"
                >
                  <div
                    className="absolute top-0 left-0 h-1 w-full"
                    style={{ backgroundColor: teamColor }}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex size-9 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
                        style={{ backgroundColor: teamColor }}
                      >
                        {t.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold tracking-tight transition-colors group-hover:text-primary">
                          {t.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Lead · {userName(t.lead_user_id) || "Not assigned"}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>

                  <p className="mt-3 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                    {t.description || "Dedicated delivery squad."}
                  </p>

                  <div className="mt-4 space-y-1.5 border-t border-border/50 pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Workload Completion</span>
                      <span className="font-semibold">{load}%</span>
                    </div>
                    <Progress value={load} className="h-1.5" />
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {openTasks} open {openTasks === 1 ? "task" : "tasks"}
                    </span>
                    <UserAvatarGroup userIds={users.slice(0, 4).map((u) => u.id)} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <CreateTeamModal
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          users={users}
        />
      </div>
    </PermissionGuard>
  );
}

function CreateTeamModal({
  open,
  onOpenChange,
  users,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: Array<{ id: string; full_name: string; email: string; job_title?: string }>;
}) {
  const createTeam = useCreateTeam();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leadUserId, setLeadUserId] = useState<string>("none");
  const [color, setColor] = useState("#2563eb");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyPreset = (preset: (typeof PRESET_TEMPLATES)[number]) => {
    setSelectedPreset(preset.name);
    setName(preset.name);
    setDescription(preset.description);
    setColor(preset.color);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setLeadUserId("none");
    setColor("#2563eb");
    setSelectedPreset(null);
    setSelectedMemberIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a team name");
      return;
    }

    try {
      setIsSubmitting(true);
      await createTeam.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        lead_user_id: leadUserId !== "none" ? leadUserId : "",
        color,
        status: "Active",
        initialMemberIds: selectedMemberIds,
      });

      toast.success(`Team "${name.trim()}" created successfully!`);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-5" />
            <DialogTitle className="text-xl">Create New Team</DialogTitle>
          </div>
          <DialogDescription>
            Choose a preset template or configure a custom delivery team for your organisation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Quick Presets Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Popular Presets (1-Click Setup)
              </Label>
              {selectedPreset ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-primary"
                  onClick={() => {
                    setSelectedPreset(null);
                    setName("");
                    setDescription("");
                  }}
                >
                  Custom blank
                </Button>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PRESET_TEMPLATES.map((preset) => {
                const Icon = preset.icon;
                const isSelected = selectedPreset === preset.name;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                        : "border-border/70 bg-card hover:border-muted-foreground/30",
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div
                        className="flex size-7 items-center justify-center rounded-md text-white shadow-xs"
                        style={{ backgroundColor: preset.color }}
                      >
                        <Icon className="size-3.5" />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
                        {preset.tag}
                      </Badge>
                    </div>
                    <span className="mt-1 font-semibold text-xs text-foreground line-clamp-1">
                      {preset.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground line-clamp-1">
                      {preset.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
            {/* Team Name */}
            <div className="space-y-1.5">
              <Label htmlFor="team-name" className="text-sm font-medium">
                Team Title / Team Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="team-name"
                placeholder="e.g. Digital Marketing, Web Development, Video Editing..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (selectedPreset && e.target.value !== selectedPreset) {
                    setSelectedPreset(null);
                  }
                }}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="team-desc" className="text-sm font-medium">
                Description & Purpose
              </Label>
              <Textarea
                id="team-desc"
                placeholder="What responsibilities and delivery capacity does this team handle?"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Team Lead */}
              <div className="space-y-1.5">
                <Label htmlFor="team-lead" className="text-sm font-medium">
                  Team Lead
                </Label>
                <Select value={leadUserId} onValueChange={setLeadUserId}>
                  <SelectTrigger id="team-lead" aria-label="Select Team Lead">
                    <SelectValue placeholder="Assign a lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No lead assigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          <span>{u.full_name}</span>
                          {u.job_title && (
                            <span className="text-xs text-muted-foreground">({u.job_title})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Theme Color */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Team Theme Color</Label>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        color === c.hex ? "ring-2 ring-foreground ring-offset-2 scale-105" : "",
                      )}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    >
                      {color === c.hex && <Check className="size-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Initial Members Selection */}
            {users.length > 0 && (
              <div className="space-y-2 pt-1">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Initial Members ({selectedMemberIds.length} selected)
                </Label>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border/70 bg-card p-2 divide-y divide-border/40">
                  {users.map((u) => {
                    const isChecked = selectedMemberIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className="flex cursor-pointer items-center justify-between gap-3 p-2 text-xs transition-colors hover:bg-muted/50 rounded-md"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <UserAvatar userId={u.id} name={u.full_name} size="xs" />
                          <div className="truncate">
                            <p className="font-medium text-foreground">{u.full_name}</p>
                            <p className="text-[11px] text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleMember(u.id)}
                          className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()} className="gap-1.5">
              <Plus className="size-4" />
              {isSubmitting ? "Creating Team..." : "Create Team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
