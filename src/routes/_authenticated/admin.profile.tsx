import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { LivePage, TextField, useLiveOrgContext } from "@/components/cloud/crm-ui";
import {
  useMyProfile,
  useMyMembership,
  useSession,
  useUpdateMyEmail,
  useUpdateMyProfile,
  useUploadMyAvatar,
} from "@/hooks/use-cloud";
import { useWorkspace } from "@/app/workspace";
import { ORG_ROLE_TO_ROLE_NAME, ROLE_PERMISSIONS } from "@/lib/permissions";
import { fmtDate, initials } from "@/lib/format";
import { Mail, ShieldCheck, UserRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/profile")({
  head: () => ({
    meta: [
      { title: "Admin Profile — Project CRM" },
      {
        name: "description",
        content: "Edit your own name, email address and profile photo used across the live workspace.",
      },
      { property: "og:title", content: "Admin Profile — Project CRM" },
      { property: "og:description", content: "Your real name, email and photo across dashboards and the assistant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminProfilePage,
});

function AdminProfilePage() {
  const { user } = useSession();
  const { activeOrgId, activeOrg } = useLiveOrgContext();
  const { data: profile, isLoading } = useMyProfile();
  const { data: membership } = useMyMembership(activeOrgId);
  const { currentUser, updateCurrentUser } = useWorkspace();
  const updateProfile = useUpdateMyProfile();
  const updateEmail = useUpdateMyEmail();
  const uploadAvatar = useUploadMyAvatar();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    setFullName(
      profile?.full_name ||
        (user?.user_metadata?.full_name as string | undefined) ||
        currentUser.full_name ||
        "",
    );
    setJobTitle(profile?.job_title || currentUser.job_title || "");
    setEmail(profile?.email || user?.email || currentUser.email || "");
  }, [
    profile?.full_name,
    profile?.job_title,
    profile?.email,
    user?.email,
    user?.user_metadata,
    currentUser.full_name,
    currentUser.job_title,
    currentUser.email,
  ]);

  const roleName = membership ? ORG_ROLE_TO_ROLE_NAME[membership.role] : "No workspace role yet";
  const permissionCount = membership ? ROLE_PERMISSIONS[ORG_ROLE_TO_ROLE_NAME[membership.role]]?.length ?? 0 : 0;

  function onSaveDetails() {
    if (!fullName.trim()) {
      toast.error("Enter your name");
      return;
    }
    updateCurrentUser({
      full_name: fullName.trim(),
      job_title: jobTitle.trim(),
    });
    updateProfile.mutate(
      { full_name: fullName.trim(), job_title: jobTitle.trim() || null },
      {
        onSuccess: () => toast.success("Profile updated"),
        onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save your profile"),
      },
    );
  }

  function onSaveEmail() {
    const next = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      toast.error("Enter a valid email address");
      return;
    }
    updateCurrentUser({ email: next });
    if (next === (user?.email ?? "")) {
      toast.info("That is already your email address");
      return;
    }
    updateEmail.mutate(next, {
      onSuccess: () => toast.success("Email address updated"),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Could not change your email"),
    });
  }

  function onPickFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    uploadAvatar.mutate(file, {
      onSuccess: () => toast.success("Profile photo updated"),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Could not upload the photo"),
    });
  }

  return (
    <LivePage title="Admin Profile" description="Your real name, email and photo used across the workspace.">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Display name" value={profile?.full_name || "Not set"} icon={UserRound} loading={isLoading} />
        <StatCard label="Sign-in email" value={user?.email ?? "—"} icon={Mail} loading={isLoading} />
        <StatCard
          label="Workspace role"
          value={roleName}
          hint={membership ? `${permissionCount} permissions in ${activeOrg?.name ?? "this organization"}` : undefined}
          icon={ShieldCheck}
          loading={isLoading}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="surface-card flex flex-col items-center gap-3 p-5 text-center">
          <Avatar className="size-24 border border-border">
            {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.full_name} /> : null}
            <AvatarFallback className="bg-primary-soft text-lg font-medium text-primary">
              {initials(profile?.full_name || user?.email || "?")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{profile?.full_name || "Your name"}</p>
            <p className="text-xs text-muted-foreground">{profile?.job_title || roleName}</p>
          </div>
          {membership ? <Badge variant="secondary">{roleName}</Badge> : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadAvatar.isPending}>
            {uploadAvatar.isPending ? "Uploading…" : "Change photo"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Joined {profile?.created_at ? fmtDate(profile.created_at) : "—"}
          </p>
        </div>

        <div className="space-y-4">
          <div className="surface-card space-y-4 p-5">
            <div>
              <h2 className="text-sm font-semibold">Personal details</h2>
              <p className="text-xs text-muted-foreground">
                Your name appears on dashboards, task assignments and in the assistant's answers.
              </p>
            </div>
            <TextField label="Full name" value={fullName} onChange={setFullName} placeholder="Your name" />
            <TextField label="Job title" value={jobTitle} onChange={setJobTitle} placeholder="e.g. Operations Lead" />
            <Button size="sm" onClick={onSaveDetails} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving…" : "Save details"}
            </Button>
          </div>

          <div className="surface-card space-y-4 p-5">
            <div>
              <h2 className="text-sm font-semibold">Sign-in email</h2>
              <p className="text-xs text-muted-foreground">
                Changing this changes the address you sign in with.
              </p>
            </div>
            <TextField label="Email address" value={email} onChange={setEmail} type="email" />
            <Button size="sm" variant="outline" onClick={onSaveEmail} disabled={updateEmail.isPending}>
              {updateEmail.isPending ? "Updating…" : "Update email"}
            </Button>
          </div>
        </div>
      </div>
    </LivePage>
  );
}
