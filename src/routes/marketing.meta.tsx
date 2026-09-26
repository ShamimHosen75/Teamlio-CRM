import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { MetricChart } from "@/components/shared/metric-chart";
import { StatusBadge } from "@/components/shared/badges";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { Badge } from "@/components/ui/badge";
import { compactNumber, money } from "@/lib/format";
import { useCampaigns } from "@/hooks/use-data";

import { Link } from "@tanstack/react-router";
import { Plug, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceIntegrations } from "@/lib/integrations/use-integrations";
import { fromNow } from "@/lib/format";

export const Route = createFileRoute("/marketing/meta")({
  head: () => ({
    meta: [
      { title: "Meta Ads — Teamlio" },
      { name: "description", content: "Facebook and Instagram ad performance by campaign." },
      { property: "og:title", content: "Meta Ads — Teamlio" },
      { property: "og:description", content: "Facebook and Instagram ad performance." },
    ],
  }),
  component: MetaAdsPage,
});

function MetaAdsPage() {
  const { data: campaigns = [], isLoading } = useCampaigns();
  const { integrations, syncIntegration } = useWorkspaceIntegrations();
  const metaState = integrations.meta;
  const isConnected = metaState?.connected ?? false;

  const spend = campaigns.reduce((s, c) => s + c.spend, 0);
  const clicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const leads = campaigns.reduce((s, c) => s + c.leads, 0);
  const revenue = campaigns.reduce((s, c) => s + c.revenue, 0);

  const trend = campaigns.map((c) => ({ name: c.name.slice(0, 12), Leads: c.leads, Clicks: c.clicks }));

  return (
    <PermissionGuard permission="marketing.read" mode="page">
      <div className="mx-auto max-w-[1500px]">
        <PageHeader
          title="Meta Ads"
          description="Performance pulled through the ads connector."
          actions={
            isConnected ? (
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="gap-1.5 py-1 px-3 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs font-medium"
                >
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    Meta Connected: {metaState.config.ad_account_id || "act_active"}
                    {metaState.last_sync_at ? ` · Synced ${fromNow(metaState.last_sync_at)}` : ""}
                  </span>
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncIntegration("meta")}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw className="size-3" />
                  <span>Sync Leads & Ads</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Demo data — no ad account connected</Badge>
                <Link to="/admin/integrations">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs text-primary border-primary/30">
                    <Plug className="size-3.5" />
                    <span>Connect Meta Business</span>
                  </Button>
                </Link>
              </div>
            )
          }
        />
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Spend" value={money(spend)} loading={isLoading} />
          <StatCard label="Clicks" value={compactNumber(clicks)} loading={isLoading} />
          <StatCard label="Leads" value={leads} tone="success" loading={isLoading} />
          <StatCard label="Cost per lead" value={leads ? money(spend / leads) : "—"} loading={isLoading} />
        </div>
        <div className="mb-5 surface-card p-4">
          <h2 className="mb-2 text-sm font-semibold">Clicks and leads by campaign</h2>
          <MetricChart type="bar" data={trend} xKey="name" series={[{ key: "Clicks", label: "Clicks" }, { key: "Leads", label: "Leads" }]} />
        </div>
        <div className="surface-card overflow-hidden">
          <h2 className="border-b px-4 py-3 text-sm font-semibold">Campaign breakdown</h2>
          <ul className="divide-y">
            {campaigns.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.objective} · {compactNumber(c.impressions)} impressions</p>
                </div>
                <div className="flex items-center gap-4">
                  <span>{money(c.spend)}</span>
                  <span className="text-muted-foreground">{c.leads} leads</span>
                  <StatusBadge status={c.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Attributed revenue across campaigns: {money(revenue)}.</p>
      </div>
    </PermissionGuard>
  );
}
