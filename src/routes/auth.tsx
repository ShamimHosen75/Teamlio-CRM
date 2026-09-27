import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Loader2, Eye, EyeOff, Layers, ArrowLeft, MailCheck, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/hooks/use-cloud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SIGNUP_ROLES = [
  { value: "member", label: "Team Member / Employee" },
  { value: "manager", label: "Project Manager" },
  { value: "admin", label: "Workspace Administrator" },
] as const;

const authSearchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup", "forgot", "reset"]).optional(),
  email: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => authSearchSchema.parse(search),
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
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "reset">(search.mode ?? "signin");
  const [email, setEmail] = useState(search.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [requestedRole, setRequestedRole] = useState("member");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  const { user, loading } = useSession();
  const navigate = useNavigate();

  // If already authenticated, redirect to destination
  useEffect(() => {
    if (!loading && user) {
      const target = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/admin/workspace";
      navigate({ to: target, replace: true });
    }
  }, [loading, user, navigate, search.redirect]);

  // Inspect URL hash for confirmation tokens, recoveries, or OAuth errors
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check query params errors
    if (search.error_description || search.error) {
      toast.error(search.error_description || search.error);
    }

    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const errDesc = params.get("error_description") || params.get("error");
    if (errDesc) {
      toast.error(decodeURIComponent(errDesc.replace(/\+/g, " ")));
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      return;
    }

    const type = params.get("type");
    if (type === "signup") {
      toast.success("Email verified successfully! Welcome to Teamlio.");
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    } else if (type === "invite") {
      toast.success("Invitation accepted! Welcome to your workspace.");
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    } else if (type === "recovery") {
      setMode("reset");
      toast.info("Please set a new password for your account.");
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [search.error, search.error_description]);

  async function handleResendConfirmation(targetEmail: string) {
    if (!targetEmail.trim()) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
      toast.success(`A fresh confirmation email was sent to ${targetEmail}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend confirmation email");
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUnconfirmedEmail(null);

    // Forgot password flow
    if (mode === "forgot") {
      if (!email.trim() || !email.includes("@")) {
        toast.error("Please enter a valid email address.");
        return;
      }
      setBusy(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth?mode=reset`,
        });
        if (error) throw error;
        setForgotSent(true);
        toast.success(`Password reset instructions sent to ${email.trim()}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send reset link");
      } finally {
        setBusy(false);
      }
      return;
    }

    // Reset password flow
    if (mode === "reset") {
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
      setBusy(true);
      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password updated successfully! Taking you to your workspace...");
        const target = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/admin/workspace";
        navigate({ to: target, replace: true });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update password");
      } finally {
        setBusy(false);
      }
      return;
    }

    // Standard sign in / sign up validation
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
            emailRedirectTo: `${window.location.origin}/auth`,
            data: {
              full_name: fullName.trim() || email.split("@")[0],
              requested_role: requestedRole,
            },
          },
        });
        if (error) throw error;

        if (!data.session) {
          setSentConfirmation(true);
          toast.success("Account created! Check your email to activate it.");
        } else {
          toast.success("Account created successfully! Welcome to Teamlio.");
          const target = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/admin/workspace";
          navigate({ to: target, replace: true });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            setUnconfirmedEmail(email.trim());
          }
          throw error;
        }
        if (data.session) {
          toast.success("Signed in successfully! Welcome back.");
          const target = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/admin/workspace";
          navigate({ to: target, replace: true });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (!msg.toLowerCase().includes("email not confirmed")) {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const redirectUri = `${window.location.origin}/auth`;
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: redirectUri,
      });
      if (result.error) {
        setBusy(false);
        toast.error(result.error.message || "Google sign-in failed. Please try again.");
        return;
      }
      if (result.redirected) return;
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    }
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

          <div className="surface-card p-6 shadow-sm">
            {mode === "forgot" ? (
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-2 mb-3 h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setMode("signin")}
                >
                  <ArrowLeft className="size-3.5" /> Back to sign in
                </Button>
                <h1 className="text-lg font-semibold tracking-tight">Reset your password</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                {forgotSent ? (
                  <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                    <div className="flex items-start gap-2.5">
                      <MailCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">Reset link dispatched</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Check <strong>{email}</strong> for instructions. Open the link to set a new password.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-email">Email address</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                      Send reset link
                    </Button>
                  </form>
                )}
              </div>
            ) : mode === "reset" ? (
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Set a new password</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a strong password with at least 6 characters.
                </p>

                <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                    Update password
                  </Button>
                </form>
              </div>
            ) : (
              <>
                <h1 className="text-lg font-semibold tracking-tight">
                  {mode === "signin" ? "Sign in to your workspace" : "Create your workspace account"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mode === "signin"
                    ? "Use your email and password, or continue with Google."
                    : "Set up an account, then create your own organization, users and teams."}
                </p>

                {sentConfirmation ? (
                  <div className="mt-5 rounded-lg border border-primary/20 bg-primary-soft/50 p-4 text-sm">
                    <div className="flex items-start gap-2.5">
                      <MailCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">Activation link sent</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          We sent a verification link to <strong>{email}</strong>. Open it to confirm your account, then sign in.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3 h-7 text-xs"
                          disabled={resending}
                          onClick={() => handleResendConfirmation(email)}
                        >
                          {resending ? <Loader2 className="mr-1.5 size-3 animate-spin" /> : <RefreshCw className="mr-1.5 size-3" />}
                          Resend confirmation email
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {unconfirmedEmail ? (
                  <div className="mt-5 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                      <div className="flex-1">
                        <p className="font-semibold text-destructive">Email not confirmed</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Your account requires email verification before signing in.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2.5 h-7 text-xs"
                          disabled={resending}
                          onClick={() => handleResendConfirmation(unconfirmedEmail)}
                        >
                          {resending ? <Loader2 className="mr-1.5 size-3 animate-spin" /> : <RefreshCw className="mr-1.5 size-3" />}
                          Resend confirmation email
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                  {mode === "signup" ? (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="full-name">Full name</Label>
                        <Input
                          id="full-name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ayesha Rahman"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="requested-role">Select your role</Label>
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
                          Your role is assigned on account creation and determines your workspace privileges.
                        </p>
                      </div>
                    </>
                  ) : null}

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" ? (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs font-normal text-muted-foreground hover:text-foreground"
                          onClick={() => setMode("forgot")}
                        >
                          Forgot password?
                        </Button>
                      ) : null}
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        required
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
                  <svg className="mr-2 size-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <p className="mt-5 text-center text-sm text-muted-foreground">
                  {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 font-medium"
                    onClick={() => {
                      setMode(mode === "signin" ? "signup" : "signin");
                      setSentConfirmation(false);
                      setUnconfirmedEmail(null);
                    }}
                  >
                    {mode === "signin" ? "Create an account" : "Sign in"}
                  </Button>
                </p>
              </>
            )}
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
