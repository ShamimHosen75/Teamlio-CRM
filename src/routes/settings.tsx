import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/app/workspace";
import { useSession, useUpdateMyProfile } from "@/hooks/use-cloud";
import { AppearanceSettingsPanel } from "@/components/settings/appearance-settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Teamlio" },
      { name: "description", content: "Organisation profile, workflow defaults and workspace preferences." },
      { property: "og:title", content: "Settings — Teamlio" },
      { property: "og:description", content: "Organisation and workspace preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { organization, currentUser, updateCurrentUser } = useWorkspace();
  const { user } = useSession();
  const updateMyProfile = useUpdateMyProfile();

  const [org, setOrg] = useState({
    name: organization.name,
    currency: organization.currency,
    timezone: organization.timezone,
    address: "12 Kemal Ataturk Ave, Dhaka",
  });
  const [profile, setProfile] = useState({
    name: currentUser.full_name,
    email: currentUser.email,
    title: currentUser.job_title,
  });
  const [prefs, setPrefs] = useState({ weekStartMonday: true, autoArchive: true, requireApproval: false, compactTables: false });

  useEffect(() => {
    setProfile({
      name: currentUser.full_name,
      email: currentUser.email,
      title: currentUser.job_title,
    });
  }, [currentUser.full_name, currentUser.email, currentUser.job_title]);

  const handleSaveProfile = () => {
    if (!profile.name.trim()) {
      toast.error("Full name cannot be empty");
      return;
    }
    updateCurrentUser({
      full_name: profile.name.trim(),
      email: profile.email.trim(),
      job_title: profile.title.trim(),
    });

    if (user) {
      updateMyProfile.mutate(
        { full_name: profile.name.trim(), job_title: profile.title.trim() || null },
        {
          onSuccess: () => toast.success("Profile updated"),
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : "Error saving profile"),
        },
      );
    } else {
      toast.success("Profile updated");
    }
  };

  return (
    <PermissionGuard permission="settings.manage" mode="page">
      <div className="mx-auto max-w-[900px]">
        <PageHeader title="Settings" description="How this workspace behaves for everyone in it." />

        <Tabs defaultValue="organisation">
          <TabsList>
            <TabsTrigger value="organisation">Organisation</TabsTrigger>
            <TabsTrigger value="profile">My profile</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>

          <TabsContent value="organisation" className="mt-4">
            <div className="surface-card space-y-4 p-5">
              <Field label="Organisation name" value={org.name} onChange={(v) => setOrg({ ...org, name: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={org.currency} onValueChange={(v) => setOrg({ ...org, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["USD", "EUR", "GBP", "BDT"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Field label="Time zone" value={org.timezone} onChange={(v) => setOrg({ ...org, timezone: v })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr">Address</Label>
                <Textarea id="addr" rows={3} value={org.address} onChange={(e) => setOrg({ ...org, address: e.target.value })} />
              </div>
              <Button size="sm" onClick={() => toast.success("Organisation settings saved")}>Save changes</Button>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="mt-4">
            <div className="surface-card space-y-4 p-5">
              <Field label="Full name" value={profile.name} onChange={(v) => setProfile({ ...profile, name: v })} />
              <Field label="Email" value={profile.email} onChange={(v) => setProfile({ ...profile, email: v })} />
              <Field label="Job title" value={profile.title} onChange={(v) => setProfile({ ...profile, title: v })} />
              <Button size="sm" onClick={handleSaveProfile}>Save profile</Button>
            </div>
          </TabsContent>

          <TabsContent value="workflow" className="mt-4">
            <div className="surface-card divide-y p-1">
              {[
                { key: "weekStartMonday", label: "Start the week on Monday", desc: "Applies to calendar and timeline views." },
                { key: "autoArchive", label: "Auto-archive completed projects", desc: "Archive 30 days after completion." },
                { key: "requireApproval", label: "Require approval before invoicing", desc: "A manager signs off each invoice." },
                { key: "compactTables", label: "Compact table density", desc: "Show more rows per screen." },
              ].map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div>
                    <p className="text-sm font-medium">{row.label}</p>
                    <p className="text-xs text-muted-foreground">{row.desc}</p>
                  </div>
                  <Switch
                    checked={prefs[row.key as keyof typeof prefs]}
                    onCheckedChange={(v) => setPrefs({ ...prefs, [row.key]: v })}
                  />
                </div>
              ))}
            </div>
            <Button size="sm" className="mt-4" onClick={() => toast.success("Workflow preferences saved")}>Save preferences</Button>
          </TabsContent>

          <TabsContent value="appearance" className="mt-4">
            <AppearanceSettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
