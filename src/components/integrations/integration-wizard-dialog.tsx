import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Key,
  Layers,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  SANDBOX_PRESETS,
  testConnectionForService,
  useWorkspaceIntegrations,
} from "@/lib/integrations/use-integrations";
import { MetaIntegrationView } from "./meta-integration-modal";
import type { ConnectionTestResult, IntegrationKey } from "@/lib/integrations/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface IntegrationWizardDialogProps {
  integrationKey: IntegrationKey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMetaTab?: "pages" | "instagram" | "ads" | "forms";
}

const INTEGRATION_METADATA: Record<
  IntegrationKey,
  {
    name: string;
    category: string;
    description: string;
    docsUrl: string;
    portalName: string;
  }
> = {
  meta: {
    name: "Meta Business",
    category: "Marketing",
    description: "Connect Facebook Pages, Instagram Accounts, Meta Ads, and Lead Generation Forms.",
    docsUrl: "https://developers.facebook.com/apps/",
    portalName: "Meta for Developers",
  },
  whatsapp: {
    name: "WhatsApp Business",
    category: "Marketing",
    description: "Two-way client messaging via official Meta WhatsApp Cloud API.",
    docsUrl: "https://business.facebook.com/wa/manage/home/",
    portalName: "WhatsApp Business Platform",
  },
  stripe: {
    name: "Payments & Invoicing",
    category: "Finance",
    description: "Accept card payments, generate invoice checkout links, and sync settlements.",
    docsUrl: "https://dashboard.stripe.com/apikeys",
    portalName: "Stripe Dashboard",
  },
  email: {
    name: "Transactional Email",
    category: "Operations",
    description: "Send workspace invitations, quotation notifications, and project alerts.",
    docsUrl: "https://resend.com/api-keys",
    portalName: "Resend / SMTP Console",
  },
  storage: {
    name: "Cloud Storage",
    category: "Files",
    description: "Store deliverables, contracts, documents, and client files with custom CDN.",
    docsUrl: "https://aws.amazon.com/s3/",
    portalName: "Cloud Console",
  },
  calendar: {
    name: "Calendar Sync",
    category: "Operations",
    description: "Two-way meeting sync, timeline scheduling, and automatic video meeting links.",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    portalName: "Google Cloud / M365 Console",
  },
};

export function IntegrationWizardDialog({
  integrationKey,
  open,
  onOpenChange,
  initialMetaTab = "pages",
}: IntegrationWizardDialogProps) {
  const { integrations, connectIntegration } = useWorkspaceIntegrations();
  const [step, setStep] = useState<number>(1);
  const [metaTab, setMetaTab] = useState<"pages" | "instagram" | "ads" | "forms">(initialMetaTab);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [draftConfig, setDraftConfig] = useState<any>({});

  // Sync draftConfig when opening
  useEffect(() => {
    if (open && integrationKey) {
      setStep(1);
      setMetaTab(initialMetaTab || "pages");
      setTestResult(null);
      const existing = integrations[integrationKey];
      if (existing?.config && Object.keys(existing.config).length > 0 && existing.connected) {
        setDraftConfig({ ...existing.config });
      } else {
        const preset = SANDBOX_PRESETS[integrationKey];
        setDraftConfig(preset?.config ? { ...preset.config } : {});
      }
    }
  }, [open, integrationKey, initialMetaTab]);

  if (!integrationKey) return null;
  const meta = INTEGRATION_METADATA[integrationKey];
  const isMeta = integrationKey === "meta";

  const handleFillSandbox = () => {
    const sandbox = SANDBOX_PRESETS[integrationKey];
    if (sandbox?.config) {
      setDraftConfig({ ...sandbox.config });
      toast.info("Filled with sandbox / test credentials for quick testing!");
    }
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testConnectionForService(integrationKey, draftConfig);
      setTestResult(res);
      if (res.success) {
        toast.success("Connection test passed!");
      } else {
        toast.error("Connection test failed: check parameters.");
      }
    } catch {
      setTestResult({
        success: false,
        latency_ms: 0,
        message: "Network error during test handshake.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndActivate = () => {
    connectIntegration(integrationKey, draftConfig);
    setStep(4);
  };

  // Step mapping for Meta
  const metaStepNum =
    step === 4
      ? 4
      : metaTab === "pages"
      ? 1
      : metaTab === "instagram"
      ? 2
      : metaTab === "ads"
      ? 3
      : 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden p-0 sm:rounded-xl">
        {/* Header */}
        <div className="border-b bg-card/60 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs uppercase tracking-wider text-muted-foreground">
                  {meta.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  • {isMeta ? `Option ${metaStepNum} of 4` : `Step ${step} of 4`}
                </span>
              </div>
              <DialogTitle className="mt-1 text-xl font-bold tracking-tight">
                Connect {meta.name}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-muted-foreground">
                {meta.description}
              </DialogDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleFillSandbox}
              className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
              title="Automatically fill with working sandbox test credentials"
            >
              <Sparkles className="size-3.5" />
              <span>Fill Sandbox Demo</span>
            </Button>
          </div>

          {/* Stepper progress */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {isMeta
              ? [
                  { num: 1, label: "Facebook Page", tab: "pages" as const },
                  { num: 2, label: "Instagram Page", tab: "instagram" as const },
                  { num: 3, label: "Meta Ads", tab: "ads" as const },
                  { num: 4, label: "Lead Forms", tab: "forms" as const },
                ].map((s) => (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => {
                      if (step !== 4) setMetaTab(s.tab);
                    }}
                    className="flex flex-col gap-1 text-left"
                  >
                    <div
                      className={cn(
                        "h-1.5 w-full rounded-full transition-all duration-300",
                        metaStepNum >= s.num ? "bg-primary" : "bg-muted",
                      )}
                    />
                    <span
                      className={cn(
                        "text-[11px] font-medium transition-colors truncate",
                        metaTab === s.tab && step !== 4
                          ? "text-primary font-semibold"
                          : "text-muted-foreground",
                      )}
                    >
                      {s.label}
                    </span>
                  </button>
                ))
              : [
                  { num: 1, label: "Credentials" },
                  { num: 2, label: "Settings" },
                  { num: 3, label: "Test Connection" },
                  { num: 4, label: "Complete" },
                ].map((s) => (
                  <div key={s.num} className="flex flex-col gap-1">
                    <div
                      className={cn(
                        "h-1.5 w-full rounded-full transition-all duration-300",
                        step >= s.num ? "bg-primary" : "bg-muted",
                      )}
                    />
                    <span
                      className={cn(
                        "text-[11px] font-medium transition-colors",
                        step === s.num ? "text-foreground font-semibold" : "text-muted-foreground",
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
          </div>
        </div>

        {/* Content area */}
        <div className="max-h-[62vh] overflow-y-auto px-6 py-5">
          {/* META DEDICATED VIEW */}
          {isMeta && step !== 4 && (
            <MetaIntegrationView
              config={draftConfig}
              onChange={setDraftConfig}
              activeTab={metaTab}
              onTabChange={setMetaTab}
            />
          )}

          {/* NON-META SERVICES: STEP 1 */}
          {!isMeta && step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Key className="size-4 text-primary" />
                  <span>Obtain your keys from the {meta.portalName}.</span>
                </div>
                <a
                  href={meta.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  <span>Open Portal</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>

              {integrationKey === "whatsapp" && (
                <div className="grid gap-3.5">
                  <div className="grid gap-1.5">
                    <Label htmlFor="wa_phone_id" className="text-xs font-medium">
                      Phone Number ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="wa_phone_id"
                      placeholder="e.g. 100293847562910"
                      value={draftConfig.phone_number_id || ""}
                      onChange={(e) => setDraftConfig({ ...draftConfig, phone_number_id: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="wa_waba_id" className="text-xs font-medium">
                      WhatsApp Business Account (WABA) ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="wa_waba_id"
                      placeholder="e.g. 105948372615204"
                      value={draftConfig.waba_id || ""}
                      onChange={(e) => setDraftConfig({ ...draftConfig, waba_id: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="wa_display_phone" className="text-xs font-medium">
                      Display Business Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="wa_display_phone"
                      placeholder="e.g. +1 (555) 019-2834"
                      value={draftConfig.phone_number || ""}
                      onChange={(e) => setDraftConfig({ ...draftConfig, phone_number: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="wa_token" className="text-xs font-medium">
                      Permanent System User Access Token <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="wa_token"
                      type="password"
                      placeholder="EAAGm..."
                      value={draftConfig.access_token || ""}
                      onChange={(e) => setDraftConfig({ ...draftConfig, access_token: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {integrationKey === "stripe" && (
                <div className="grid gap-3.5">
                  <div className="grid gap-1.5">
                    <Label htmlFor="stripe_provider" className="text-xs font-medium">
                      Payment Gateway Provider
                    </Label>
                    <select
                      id="stripe_provider"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={draftConfig.provider || "stripe"}
                      onChange={(e) => setDraftConfig({ ...draftConfig, provider: e.target.value })}
                    >
                      <option value="stripe">Stripe (Credit Cards, Apple Pay, Google Pay)</option>
                      <option value="razorpay">Razorpay (Cards, UPI, Netbanking)</option>
                      <option value="paypal">PayPal Commerce</option>
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="stripe_pub_key" className="text-xs font-medium">
                      Publishable Key <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="stripe_pub_key"
                      placeholder="pk_test_... or pk_live_..."
                      value={draftConfig.publishable_key || ""}
                      onChange={(e) => setDraftConfig({ ...draftConfig, publishable_key: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="stripe_sec_key" className="text-xs font-medium">
                      Secret API Key <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="stripe_sec_key"
                      type="password"
                      placeholder="sk_test_... or sk_live_..."
                      value={draftConfig.secret_key || ""}
                      onChange={(e) => setDraftConfig({ ...draftConfig, secret_key: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {integrationKey === "email" && (
                <div className="grid gap-3.5">
                  <div className="grid gap-1.5">
                    <Label htmlFor="email_provider" className="text-xs font-medium">
                      Email Service Provider
                    </Label>
                    <select
                      id="email_provider"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={draftConfig.provider || "resend"}
                      onChange={(e) => setDraftConfig({ ...draftConfig, provider: e.target.value })}
                    >
                      <option value="resend">Resend (Modern REST API)</option>
                      <option value="sendgrid">SendGrid</option>
                      <option value="postmark">Postmark</option>
                      <option value="smtp">Custom SMTP Server</option>
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="email_api_key" className="text-xs font-medium">
                      API Key <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email_api_key"
                      type="password"
                      placeholder="re_... or SG...."
                      value={draftConfig.api_key || ""}
                      onChange={(e) => setDraftConfig({ ...draftConfig, api_key: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {integrationKey === "storage" && (
                <div className="grid gap-3.5">
                  <div className="grid gap-1.5">
                    <Label htmlFor="storage_provider" className="text-xs font-medium">
                      Cloud Storage Backend
                    </Label>
                    <select
                      id="storage_provider"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={draftConfig.provider || "s3"}
                      onChange={(e) => setDraftConfig({ ...draftConfig, provider: e.target.value })}
                    >
                      <option value="s3">Amazon Web Services (AWS S3)</option>
                      <option value="supabase">Supabase Storage</option>
                      <option value="r2">Cloudflare R2</option>
                      <option value="gcs">Google Cloud Storage</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="storage_bucket" className="text-xs font-medium">
                        Bucket Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="storage_bucket"
                        placeholder="teamlio-media-vault"
                        value={draftConfig.bucket_name || ""}
                        onChange={(e) => setDraftConfig({ ...draftConfig, bucket_name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="storage_region" className="text-xs font-medium">
                        Region
                      </Label>
                      <Input
                        id="storage_region"
                        placeholder="us-east-1"
                        value={draftConfig.region || "us-east-1"}
                        onChange={(e) => setDraftConfig({ ...draftConfig, region: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {integrationKey === "calendar" && (
                <div className="grid gap-3.5">
                  <div className="grid gap-1.5">
                    <Label htmlFor="cal_provider" className="text-xs font-medium">
                      Calendar System
                    </Label>
                    <select
                      id="cal_provider"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={draftConfig.provider || "google"}
                      onChange={(e) => setDraftConfig({ ...draftConfig, provider: e.target.value })}
                    >
                      <option value="google">Google Workspace / Google Calendar</option>
                      <option value="outlook">Microsoft 365 / Outlook Calendar</option>
                      <option value="caldav">Apple iCloud / CalDAV</option>
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="cal_email" className="text-xs font-medium">
                      Connected Account Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cal_email"
                      type="email"
                      placeholder="admin@yourcompany.com"
                      value={draftConfig.account_email || ""}
                      onChange={(e) => setDraftConfig({ ...draftConfig, account_email: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NON-META SERVICES: STEP 2 */}
          {!isMeta && step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
                Configure synchronization rules, notification behaviors, and defaults for this service.
              </div>

              {integrationKey === "whatsapp" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-medium">Auto-create Leads from Inbound Chats</Label>
                      <p className="text-[11px] text-muted-foreground">
                        New inbound WhatsApp contacts automatically get created as CRM Leads.
                      </p>
                    </div>
                    <Switch
                      checked={draftConfig.auto_create_leads ?? true}
                      onCheckedChange={(checked) => setDraftConfig({ ...draftConfig, auto_create_leads: checked })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-medium">Default Auto-Welcome Reply</Label>
                    <Input
                      placeholder="Hi! Welcome to Teamlio. An account manager will reply soon."
                      value={draftConfig.welcome_message || ""}
                      onChange={(e) => setDraftConfig({ ...draftConfig, welcome_message: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {integrationKey === "stripe" && (
                <div className="space-y-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-medium">Default Currency</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={draftConfig.currency || "USD"}
                      onChange={(e) => setDraftConfig({ ...draftConfig, currency: e.target.value })}
                    >
                      <option value="USD">USD ($ - US Dollar)</option>
                      <option value="EUR">EUR (€ - Euro)</option>
                      <option value="GBP">GBP (£ - British Pound)</option>
                      <option value="BDT">BDT (৳ - Bangladeshi Taka)</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-medium">Automatic Email Receipts</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Send branded receipt immediately upon invoice settlement.
                      </p>
                    </div>
                    <Switch
                      checked={draftConfig.auto_receipts ?? true}
                      onCheckedChange={(checked) => setDraftConfig({ ...draftConfig, auto_receipts: checked })}
                    />
                  </div>
                </div>
              )}

              {integrationKey === "email" && (
                <div className="space-y-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-medium">From Sender Name</Label>
                    <Input
                      placeholder="Teamlio Notifications"
                      value={draftConfig.from_name || ""}
                      onChange={(e) => setDraftConfig({ ...draftConfig, from_name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-medium">From Email Address</Label>
                    <Input
                      placeholder="noreply@yourdomain.com"
                      value={draftConfig.from_email || ""}
                      onChange={(e) => setDraftConfig({ ...draftConfig, from_email: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {integrationKey === "storage" && (
                <div className="space-y-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-medium">Custom CDN Domain</Label>
                    <Input
                      placeholder="https://cdn.youragency.com"
                      value={draftConfig.cdn_domain || ""}
                      onChange={(e) => setDraftConfig({ ...draftConfig, cdn_domain: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {integrationKey === "calendar" && (
                <div className="space-y-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-medium">Sync Direction</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={draftConfig.sync_direction || "two_way"}
                      onChange={(e) => setDraftConfig({ ...draftConfig, sync_direction: e.target.value })}
                    >
                      <option value="two_way">2-Way Bi-directional Sync</option>
                      <option value="one_way">Export Only (Teamlio → Calendar)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NON-META SERVICES: STEP 3 */}
          {!isMeta && step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card/40 p-4 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="size-6" />
                </div>
                <h3 className="mt-3 text-sm font-semibold">Test Connection Handshake</h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                  Teamlio will execute a live test handshake to verify credentials and endpoints.
                </p>

                <div className="mt-4 flex justify-center">
                  <Button
                    size="sm"
                    onClick={handleRunTest}
                    disabled={isTesting}
                    className="gap-2"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Verifying credentials...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="size-4" />
                        <span>Run Connection Test</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {testResult && (
                <div
                  className={cn(
                    "rounded-xl border p-4 transition-all duration-300",
                    testResult.success
                      ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-300"
                      : "border-destructive/40 bg-destructive/5 text-destructive",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {testResult.success ? (
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                    ) : (
                      <AlertCircle className="size-5 shrink-0 text-destructive" />
                    )}
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">
                          {testResult.success ? "Connection Verified & Operational" : "Connection Failed"}
                        </span>
                        <span className="text-[11px] opacity-75 font-mono">{testResult.latency_ms}ms latency</span>
                      </div>
                      <p className="mt-1 opacity-90">{testResult.message}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ALL SERVICES: STEP 4 (COMPLETE) */}
          {step === 4 && (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-8 ring-emerald-500/5">
                <CheckCircle2 className="size-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Successfully Connected!</h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                  {meta.name} is now linked to your workspace. All related CRM, marketing, and automated delivery features are now live.
                </p>
              </div>

              {isMeta && (
                <div className="mx-auto max-w-md rounded-lg border bg-muted/20 p-3 text-xs text-left space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Facebook Page:</span>
                    <span className="font-semibold text-foreground">
                      {draftConfig.selected_page_name || "Teamlio Global Agency"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Instagram Account:</span>
                    <span className="font-semibold text-foreground">
                      {draftConfig.selected_instagram_username || "@teamlio_official"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Meta Ads Account:</span>
                    <span className="font-semibold font-mono text-foreground">
                      {draftConfig.selected_ad_account_id || "act_4928192847"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lead Gen Forms:</span>
                    <span className="font-semibold text-emerald-400">
                      {draftConfig.active_lead_forms_count || 2} Forms Syncing to CRM Leads
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-3 pt-2">
                <Button variant="default" size="sm" onClick={() => onOpenChange(false)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t bg-muted/20 px-6 py-4">
          {isMeta && step !== 4 ? (
            <>
              {metaTab !== "pages" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (metaTab === "forms") setMetaTab("ads");
                    else if (metaTab === "ads") setMetaTab("instagram");
                    else if (metaTab === "instagram") setMetaTab("pages");
                  }}
                  className="gap-1.5 text-xs"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>
                    Back to{" "}
                    {metaTab === "forms"
                      ? "Meta Ads"
                      : metaTab === "ads"
                      ? "Instagram"
                      : "Facebook Page"}
                  </span>
                </Button>
              ) : (
                <div />
              )}

              {metaTab !== "forms" ? (
                <Button
                  size="sm"
                  onClick={() => {
                    if (metaTab === "pages") setMetaTab("instagram");
                    else if (metaTab === "instagram") setMetaTab("ads");
                    else if (metaTab === "ads") setMetaTab("forms");
                  }}
                  className="gap-1.5 text-xs ml-auto"
                >
                  <span>
                    Next:{" "}
                    {metaTab === "pages"
                      ? "Instagram Page"
                      : metaTab === "instagram"
                      ? "Meta Ads"
                      : "Lead Forms"}
                  </span>
                  <ArrowRight className="size-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSaveAndActivate}
                  className="gap-1.5 text-xs ml-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>Save & Connect Meta Business</span>
                </Button>
              )}
            </>
          ) : (
            <>
              {step > 1 && step < 4 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep((s) => s - 1)}
                  className="gap-1.5 text-xs"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Back</span>
                </Button>
              ) : (
                <div />
              )}

              {step < 3 && (
                <Button
                  size="sm"
                  onClick={() => setStep((s) => s + 1)}
                  className="gap-1.5 text-xs ml-auto"
                >
                  <span>Next Step</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              )}

              {step === 3 && (
                <Button
                  size="sm"
                  onClick={handleSaveAndActivate}
                  className="gap-1.5 text-xs ml-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>Save & Connect Service</span>
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
