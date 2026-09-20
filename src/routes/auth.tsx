import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Loader2, Eye, EyeOff, Layers } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/hooks/use-cloud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SIGNUP_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "member", label: "Employees" },
] as const;

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Teamlio" },
      {
        name: "description",
        content: "Sign in or create an account to manage your own organizations, users and teams.",
      },
      { property: "og:title", content: "Sign in — Teamlio" },
      { property: "og:description", content: "Access your Teamlio workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [requestedRole, setRequestedRole] = useState("member");
  const [busy, setBusy] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);
  const { user, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/admin/workspace", replace: true });
  }, [loading, user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("Enter an email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName.trim() || email.split("@")[0],
              requested_role: requestedRole,
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSentConfirmation(true);
          toast.success("Account created. Check your email to confirm it.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-primary-soft/40 to-background" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[1.05fr_minmax(360px,420px)]">
        <DashboardPreview />
      <div className="w-full max-w-sm justify-self-center lg:justify-self-end">
        <div className="mb-6 flex items-center gap-2.5">
          <img src="/logo.png" alt="Teamlio" className="size-9 object-contain" />
          <span>
            <span className="block text-sm font-semibold">Teamlio</span>
            <span className="block text-[11px] text-muted-foreground">Project Management CRM</span>
          </span>
        </div>

        <div className="surface-card p-6">
          <h1 className="text-lg font-semibold tracking-tight">
            {mode === "signin" ? "Sign in to your workspace" : "Create your workspace account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Use your email and password, or continue with Google."
              : "Set up an account, then create your own organization, users and teams."}
          </p>

          {sentConfirmation ? (
            <div className="mt-5 rounded-md border bg-muted/50 p-4 text-sm">
              We sent a confirmation link to <strong>{email}</strong>. Open it to activate your account, then sign in.
            </div>
          ) : null}

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="full-name">Full name</Label>
                  <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ayesha Rahman" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="requested-role">Requested role</Label>
                  <Select value={requestedRole} onValueChange={setRequestedRole}>
                    <SelectTrigger id="requested-role" className="w-full">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[80]">
                      {SIGNUP_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Your workspace owner confirms access. Invitations always use their assigned role.
                  </p>
                </div>
              </>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
            Continue with Google
          </Button>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 font-medium"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </Button>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">
            Back to the demo workspace
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}

function DashboardPreview() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 120);
    return () => clearTimeout(t);
  }, []);

  const bars = [42, 68, 54, 88, 61, 76, 95];
  const kpis = [
    { label: "Active projects", value: "335", tone: "bg-primary-soft text-primary" },
    { label: "Open deals", value: "240", tone: "bg-success/10 text-success" },
    { label: "Invoices paid", value: "150", tone: "bg-warning/15 text-warning-foreground" },
    { label: "Team members", value: "80", tone: "bg-accent text-accent-foreground" },
  ];

  return (
    <div className="hidden lg:block">
      <div className="surface-card relative overflow-hidden rounded-2xl p-6 shadow-raised">
        <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Layers className="size-3.5" />
              </span>
              <span className="text-sm font-semibold">Admin dashboard</span>
            </div>
            <div className="flex gap-1.5">
              <span className="size-2 rounded-full bg-destructive/40" />
              <span className="size-2 rounded-full bg-warning/50" />
              <span className="size-2 rounded-full bg-success/50" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {kpis.map((k, i) => (
              <div
                key={k.label}
                className="rounded-xl border border-border/70 p-3 transition-all duration-700"
                style={{
                  transitionDelay: `${i * 90}ms`,
                  opacity: ready ? 1 : 0,
                  transform: ready ? "translateY(0)" : "translateY(12px)",
                }}
              >
                <p className="text-[11px] text-muted-foreground">{k.label}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xl font-semibold tracking-tight">{k.value}</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${k.tone}`}>live</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-border/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Revenue growth</p>
              <p className="text-[11px] text-muted-foreground">Last 7 months</p>
            </div>
            <div className="mt-4 flex h-32 items-end gap-2">
              {bars.map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md bg-primary/15">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-primary/60 to-primary transition-all duration-1000 ease-out"
                    style={{ height: ready ? `${(h / 100) * 128}px` : "0px", transitionDelay: `${i * 80}ms` }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {["Website redesign", "CRM migration", "Mobile app launch"].map((name, i) => {
              const pct = [82, 56, 34][i];
              return (
                <div key={name} className="rounded-lg border border-border/70 px-3 py-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium">{name}</span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                      style={{ width: ready ? `${pct}%` : "0%", transitionDelay: `${300 + i * 140}ms` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
