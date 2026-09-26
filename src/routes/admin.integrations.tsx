import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Cloud,
  CreditCard,
  ExternalLink,
  Layers,
  Mail,
  MessageCircle,
  PlayCircle,
  Plug,
  Power,
  RefreshCw,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceIntegrations } from "@/lib/integrations/use-integrations";
import { IntegrationWizardDialog } from "@/components/integrations/integration-wizard-dialog";
import type { IntegrationKey } from "@/lib/integrations/types";
import { fromNow } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — Teamlio" },
      { name: "description", content: "Connect messaging, advertising, payment, email and storage services." },
      { property: "og:title", content: "Integrations — Teamlio" },
      { property: "og:description", content: "Connect the services your workspace relies on." },
    ],
  }),
  component: IntegrationsPage,
});

interface IntegrationMeta {
  key: IntegrationKey;
  name: string;
  category: "Marketing" | "Finance" | "Operations" | "Files";
  description: string;
  icon: typeof Layers;
  accentColor: string;
  bgColor: string;
  docsUrl: string;
}

const INTEGRATIONS_METADATA: IntegrationMeta[] = [
  {
    key: "meta",
    name: "Meta Business",
    category: "Marketing",
    description: "Facebook and Instagram pages, Meta Ads campaigns, and Lead Ad instant forms.",
    icon: Share2,
    accentColor: "text-blue-500",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    docsUrl: "https://developers.facebook.com",
  },
  {
    key: "whatsapp",
    name: "WhatsApp Business",
    category: "Marketing",
    description: "Two-way client messaging via official Meta WhatsApp Cloud API with auto-lead generation.",
    icon: MessageCircle,
    accentColor: "text-emerald-500",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
    docsUrl: "https://business.facebook.com/wa/manage/home/",
  },
  {
    key: "stripe",
    name: "Payments & Invoicing",
    category: "Finance",
    description: "Accept credit cards, online payments, and automate invoice settlements via Stripe/Razorpay.",
    icon: CreditCard,
    accentColor: "text-violet-500",
    bgColor: "bg-violet-500/10 border-violet-500/20",
    docsUrl: "https://dashboard.stripe.com",
  },
  {
    key: "email",
    name: "Transactional Email",
    category: "Operations",
    description: "Send workspace invitations, quotation notifications, and client payment receipts via Resend/SMTP.",
    icon: Mail,
    accentColor: "text-amber-500",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    docsUrl: "https://resend.com",
  },
  {
    key: "storage",
    name: "Cloud Storage",
    category: "Files",
    description: "Store deliverables, contracts, documents, and client files with AWS S3 / Supabase Storage.",
    icon: Cloud,
    accentColor: "text-cyan-500",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
    docsUrl: "https://aws.amazon.com/s3/",
  },
  {
    key: "calendar",
    name: "Calendar Sync",
    category: "Operations",
    description: "Two-way meeting sync, timeline scheduling, and automatic Google Meet/Teams video links.",
    icon: Calendar,
    accentColor: "text-rose-500",
    bgColor: "bg-rose-500/10 border-rose-500/20",
    docsUrl: "https://calendar.google.com",
  },
];

function IntegrationsPage() {
  const {
    integrations,
    disconnectIntegration,
    syncIntegration,
    quickConnectAllSandbox,
    resetAllToDisconnected,
  } = useWorkspaceIntegrations();

  const [activeModalKey, setActiveModalKey] = useState<IntegrationKey | null>(null);
  const [initialMetaTab, setInitialMetaTab] = useState<"pages" | "instagram" | "ads" | "forms">("pages");
  const [syncingKey, setSyncingKey] = useState<string | null>(null);

  const connectedCount = Object.values(integrations).filter((i) => i.connected).length;

  const handleSync = async (key: IntegrationKey) => {
    setSyncingKey(key);
    try {
      await syncIntegration(key);
    } finally {
      setSyncingKey(null);
    }
  };

  return (
    <PermissionGuard permission="admin.access" mode="page">
      <div className="mx-auto max-w-[1300px] space-y-6">
        <PageHeader
          title="Integrations"
          description="Connect messaging, advertising, payment, and cloud services to automate your workspace."
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge
                variant="outline"
                className={cn(
                  "gap-1.5 py-1 px-3 text-xs font-medium",
                  connectedCount > 0
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "text-muted-foreground",
                )}
              >
                <span className={cn("size-2 rounded-full", connectedCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-muted")} />
                <span>{connectedCount} of 6 Connected</span>
              </Badge>

              <Button
                variant="outline"
                size="sm"
                onClick={quickConnectAllSandbox}
                className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                title="Connect all 6 modules with working sandbox environments"
              >
                <Sparkles className="size-3.5" />
                <span>Quick Connect All (Sandbox)</span>
              </Button>

              {connectedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetAllToDisconnected}
                  className="text-xs text-muted-foreground hover:text-destructive"
                  title="Disconnect all services"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  <span>Reset All</span>
                </Button>
              )}
            </div>
          }
        />

        {/* Integration Cards Grid */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {INTEGRATIONS_METADATA.map((item) => {
            const state = integrations[item.key];
            const isConnected = state?.connected ?? false;
            const Icon = item.icon;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const config: any = state?.config ?? {};

            return (
              <article
                key={item.key}
                className={cn(
                  "group relative flex flex-col justify-between rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-md",
                  isConnected ? "border-primary/30 ring-1 ring-primary/20" : "hover:border-border/80",
                )}
              >
                <div>
                  {/* Top Bar with Icon & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex size-11 items-center justify-center rounded-xl border", item.bgColor)}>
                        <Icon className={cn("size-5", item.accentColor)} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold tracking-tight">{item.name}</h3>
                        <p className="text-[11px] text-muted-foreground">{item.category}</p>
                      </div>
                    </div>

                    <Badge
                      variant={isConnected ? "default" : "secondary"}
                      className={cn(
                        "text-[11px] font-medium transition-colors",
                        isConnected
                          ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30 border"
                          : "text-muted-foreground",
                      )}
                    >
                      {isConnected ? (
                        <span className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Connected
                        </span>
                      ) : (
                        "Not connected"
                      )}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>

                  {/* Meta Specific Channels & Assets Options */}
                  {item.key === "meta" && (
                    <div className="mt-4 space-y-2 border-t pt-3">
                      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <span>Connected Options & Assets:</span>
                        <span className="text-[10px] text-primary lowercase">click to configure</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            setInitialMetaTab("pages");
                            setActiveModalKey("meta");
                          }}
                          className="flex items-center justify-between rounded-lg border bg-muted/40 p-2 text-left hover:bg-accent/60 transition-colors"
                          title="Configure Facebook Business Page"
                        >
                          <span className="truncate">📘 FB Page</span>
                          <Badge variant="outline" className="text-[9px] py-0 px-1 text-blue-400 border-blue-500/30">
                            {config.selected_page_name ? "Linked" : "Select"}
                          </Badge>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setInitialMetaTab("instagram");
                            setActiveModalKey("meta");
                          }}
                          className="flex items-center justify-between rounded-lg border bg-muted/40 p-2 text-left hover:bg-accent/60 transition-colors"
                          title="Configure Instagram Business Profile"
                        >
                          <span className="truncate">📷 Instagram</span>
                          <Badge variant="outline" className="text-[9px] py-0 px-1 text-pink-400 border-pink-500/30">
                            {config.selected_instagram_username ? "Linked" : "Select"}
                          </Badge>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setInitialMetaTab("ads");
                            setActiveModalKey("meta");
                          }}
                          className="flex items-center justify-between rounded-lg border bg-muted/40 p-2 text-left hover:bg-accent/60 transition-colors"
                          title="Configure Meta Ads Account"
                        >
                          <span className="truncate">📊 Meta Ads</span>
                          <Badge variant="outline" className="text-[9px] py-0 px-1 text-violet-400 border-violet-500/30">
                            {config.selected_ad_account_id ? "Active" : "Select"}
                          </Badge>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setInitialMetaTab("forms");
                            setActiveModalKey("meta");
                          }}
                          className="flex items-center justify-between rounded-lg border bg-muted/40 p-2 text-left hover:bg-accent/60 transition-colors"
                          title="Configure Instant Lead Generation Forms"
                        >
                          <span className="truncate">📋 Lead Forms</span>
                          <Badge variant="outline" className="text-[9px] py-0 px-1 text-emerald-400 border-emerald-500/30">
                            {config.active_lead_forms_count ? `${config.active_lead_forms_count} Syncing` : "Sync"}
                          </Badge>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Connection Details if active */}
                  {isConnected && item.key !== "meta" && (
                    <div className="mt-4 space-y-1.5 rounded-lg border bg-muted/30 p-2.5 text-[11px]">

                      {item.key === "whatsapp" && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Phone Number:</span>
                            <span className="font-mono font-medium">{config.phone_number || "+1 (555) 019-2834"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cloud API:</span>
                            <span className="text-emerald-400">Verified</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Inbound Auto-Lead:</span>
                            <span className="text-emerald-400">Enabled</span>
                          </div>
                        </>
                      )}

                      {item.key === "stripe" && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Gateway:</span>
                            <span className="font-semibold uppercase">{config.provider || "STRIPE"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Currency / Mode:</span>
                            <span className="font-mono">{config.currency || "USD"} ({config.mode === "live" ? "Live" : "Test"})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Webhooks:</span>
                            <span className="text-emerald-400">Subscribed</span>
                          </div>
                        </>
                      )}

                      {item.key === "email" && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Provider:</span>
                            <span className="font-semibold capitalize">{config.provider || "Resend"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sender:</span>
                            <span className="truncate max-w-[140px] font-mono">{config.from_email || "noreply@teamlio.io"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Domain Status:</span>
                            <span className="text-emerald-400">SPF/DKIM Valid</span>
                          </div>
                        </>
                      )}

                      {item.key === "storage" && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Storage:</span>
                            <span className="font-semibold uppercase">{config.provider || "AWS S3"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Bucket:</span>
                            <span className="font-mono">{config.bucket_name || "teamlio-vault"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Region:</span>
                            <span>{config.region || "us-east-1"}</span>
                          </div>
                        </>
                      )}

                      {item.key === "calendar" && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Provider:</span>
                            <span className="font-semibold capitalize">{config.provider || "Google"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Account:</span>
                            <span className="truncate max-w-[140px] font-mono">{config.account_email || "admin@teamlio.io"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">2-Way Sync:</span>
                            <span className="text-emerald-400">Active</span>
                          </div>
                        </>
                      )}

                      {state?.last_sync_at && (
                        <div className="pt-1 text-[10px] text-muted-foreground border-t border-border/40">
                          Last active {fromNow(state.last_sync_at)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="mt-5 pt-3 border-t flex items-center justify-between gap-2">
                  {!isConnected ? (
                    <Button
                      size="sm"
                      className="w-full gap-2 font-medium"
                      onClick={() => setActiveModalKey(item.key)}
                    >
                      <Plug className="size-3.5" />
                      <span>Connect {item.name}</span>
                    </Button>
                  ) : (
                    <div className="flex w-full items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 text-xs"
                        onClick={() => setActiveModalKey(item.key)}
                      >
                        <Settings className="size-3.5 text-muted-foreground" />
                        <span>Configure</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                        title="Sync and test connection"
                        onClick={() => handleSync(item.key)}
                        disabled={syncingKey === item.key}
                      >
                        <RefreshCw className={cn("size-3.5", syncingKey === item.key && "animate-spin")} />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title={`Disconnect ${item.name}`}
                        onClick={() => disconnectIntegration(item.key)}
                      >
                        <Power className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* Wizard Dialog */}
        <IntegrationWizardDialog
          integrationKey={activeModalKey}
          open={Boolean(activeModalKey)}
          initialMetaTab={initialMetaTab}
          onOpenChange={(open) => {
            if (!open) setActiveModalKey(null);
          }}
        />
      </div>
    </PermissionGuard>
  );
}
