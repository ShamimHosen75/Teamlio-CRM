import { useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Layers,
  MessageCircle,
  Plus,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  FacebookPageAsset,
  InstagramAccountAsset,
  MetaAdAccountAsset,
  MetaConfig,
  MetaLeadFormAsset,
} from "@/lib/integrations/types";

interface MetaIntegrationViewProps {
  config: MetaConfig;
  onChange: (next: MetaConfig) => void;
  activeTab: "pages" | "instagram" | "ads" | "forms";
  onTabChange: (tab: "pages" | "instagram" | "ads" | "forms") => void;
}

const SAMPLE_PAGES: FacebookPageAsset[] = [
  { id: "109283746592019", name: "Teamlio Global Agency", category: "Marketing & Software Agency", likes: 14200, is_selected: true },
  { id: "201928374619283", name: "Teamlio Careers & Corporate", category: "Company & Enterprise", likes: 3840, is_selected: false },
  { id: "301948572619485", name: "Teamlio Client Community", category: "Product Group", likes: 1950, is_selected: false },
];

const SAMPLE_INSTAGRAM: InstagramAccountAsset[] = [
  { id: "ig_981726354", username: "@teamlio_official", name: "Teamlio Digital Software", followers: 28400, is_selected: true },
  { id: "ig_102938475", username: "@teamlio_agency", name: "Teamlio Creative Studio", followers: 6100, is_selected: false },
];

const SAMPLE_AD_ACCOUNTS: MetaAdAccountAsset[] = [
  { id: "act_4928192847", name: "Teamlio Growth Campaigns (USD)", currency: "USD", account_status: 1, is_selected: true },
  { id: "act_1029384756", name: "Teamlio Retargeting & Brand", currency: "USD", account_status: 1, is_selected: false },
];

const SAMPLE_LEAD_FORMS: MetaLeadFormAsset[] = [
  { id: "form_109283", name: "Q3 Website Contact & Consultation Instant Form", leads_count: 48, created_time: "2026-08-10", is_sync_enabled: true, destination: "crm_leads" },
  { id: "form_291029", name: "VIP Enterprise Demo Request Form", leads_count: 23, created_time: "2026-09-01", is_sync_enabled: true, destination: "crm_leads" },
  { id: "form_384729", name: "Newsletter & Digital Growth Webinar Form", leads_count: 112, created_time: "2026-07-25", is_sync_enabled: false, destination: "crm_leads" },
];

export function MetaIntegrationView({
  config,
  onChange,
  activeTab,
  onTabChange,
}: MetaIntegrationViewProps) {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [customPageName, setCustomPageName] = useState("");

  const pages = config.facebook_pages?.length ? config.facebook_pages : SAMPLE_PAGES;
  const instagram = config.instagram_accounts?.length ? config.instagram_accounts : SAMPLE_INSTAGRAM;
  const adAccounts = config.ad_accounts?.length ? config.ad_accounts : SAMPLE_AD_ACCOUNTS;
  const leadForms = config.lead_forms?.length ? config.lead_forms : SAMPLE_LEAD_FORMS;

  const selectedPage = pages.find((p) => p.is_selected) ?? pages[0];
  const selectedIg = instagram.find((i) => i.is_selected) ?? instagram[0];
  const selectedAd = adAccounts.find((a) => a.is_selected) ?? adAccounts[0];
  const activeFormsCount = leadForms.filter((f) => f.is_sync_enabled).length;

  const handleQuickAuthorizeAll = () => {
    setIsAuthorizing(true);
    setTimeout(() => {
      onChange({
        ...config,
        app_id: config.app_id || "492817294829103",
        ad_account_id: selectedAd?.id || "act_4928192847",
        page_id: selectedPage?.id || "109283746592019",
        page_name: selectedPage?.name || "Teamlio Global Agency",
        selected_page_name: selectedPage?.name || "Teamlio Global Agency",
        selected_instagram_username: selectedIg?.username || "@teamlio_official",
        selected_ad_account_id: selectedAd?.id || "act_4928192847",
        active_lead_forms_count: activeFormsCount || 2,
        facebook_pages: pages,
        instagram_accounts: instagram,
        ad_accounts: adAccounts,
        lead_forms: leadForms,
        sync_leads: true,
        sync_campaigns: true,
      });
      setIsAuthorizing(false);
      toast.success("Authorized with Meta! All 4 options connected.");
    }, 600);
  };

  const handleSelectPage = (id: string) => {
    const updated = pages.map((p) => ({ ...p, is_selected: p.id === id }));
    const picked = updated.find((p) => p.id === id);
    onChange({
      ...config,
      facebook_pages: updated,
      page_id: picked?.id,
      page_name: picked?.name,
      selected_page_name: picked?.name,
    });
    toast.success(`Selected Facebook Page: ${picked?.name}`);
  };

  const handleAddCustomPage = () => {
    if (!customPageName.trim()) return;
    const newPage: FacebookPageAsset = {
      id: `custom_${Date.now()}`,
      name: customPageName.trim(),
      category: "Connected Page",
      likes: 1200,
      is_selected: true,
    };
    const updated = [...pages.map((p) => ({ ...p, is_selected: false })), newPage];
    onChange({
      ...config,
      facebook_pages: updated,
      page_id: newPage.id,
      page_name: newPage.name,
      selected_page_name: newPage.name,
    });
    setCustomPageName("");
    toast.success(`Connected custom page: ${newPage.name}`);
  };

  const handleSelectInstagram = (id: string) => {
    const updated = instagram.map((i) => ({ ...i, is_selected: i.id === id }));
    const picked = updated.find((i) => i.id === id);
    onChange({
      ...config,
      instagram_accounts: updated,
      selected_instagram_username: picked?.username,
    });
    toast.success(`Selected Instagram Account: ${picked?.username}`);
  };

  const handleSelectAdAccount = (id: string) => {
    const updated = adAccounts.map((a) => ({ ...a, is_selected: a.id === id }));
    const picked = updated.find((a) => a.id === id);
    onChange({
      ...config,
      ad_accounts: updated,
      ad_account_id: picked?.id,
      selected_ad_account_id: picked?.id,
    });
    toast.success(`Selected Meta Ad Account: ${picked?.name}`);
  };

  const handleToggleLeadForm = (id: string, enabled: boolean) => {
    const updated = leadForms.map((f) => (f.id === id ? { ...f, is_sync_enabled: enabled } : f));
    const activeCount = updated.filter((f) => f.is_sync_enabled).length;
    onChange({
      ...config,
      lead_forms: updated,
      active_lead_forms_count: activeCount,
      sync_leads: activeCount > 0,
    });
    toast.success(enabled ? "Lead form sync enabled for CRM Leads." : "Lead form sync disabled.");
  };

  return (
    <div className="space-y-4">
      {/* Quick Connect Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-base shadow-sm">
            f
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground">Meta Business Suite Authentication</h4>
            <p className="text-[11px] text-muted-foreground">
              Connect Facebook Pages, Instagram Accounts, Ad Accounts, and Lead Forms.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleQuickAuthorizeAll}
          disabled={isAuthorizing}
          className="gap-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          {isAuthorizing ? (
            <>
              <RefreshCw className="size-3.5 animate-spin" />
              <span>Authorizing with Meta...</span>
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" />
              <span>Connect All Options (1-Click)</span>
            </>
          )}
        </Button>
      </div>

      {/* 4 Interactive Option Tabs */}
      <div className="grid grid-cols-4 gap-2 border-b pb-2">
        <button
          type="button"
          onClick={() => onTabChange("pages")}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border p-2.5 text-center transition-all",
            activeTab === "pages"
              ? "border-blue-500/50 bg-blue-500/10 text-foreground shadow-sm ring-1 ring-blue-500/20"
              : "border-border/60 hover:bg-muted/40 text-muted-foreground",
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-blue-500">📘</span>
            <span>1. Facebook Page</span>
          </div>
          <span className="mt-1 text-[10px] text-muted-foreground truncate max-w-full">
            {selectedPage?.name || "Not connected"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("instagram")}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border p-2.5 text-center transition-all",
            activeTab === "instagram"
              ? "border-pink-500/50 bg-pink-500/10 text-foreground shadow-sm ring-1 ring-pink-500/20"
              : "border-border/60 hover:bg-muted/40 text-muted-foreground",
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-pink-500">📷</span>
            <span>2. Instagram Page</span>
          </div>
          <span className="mt-1 text-[10px] text-muted-foreground truncate max-w-full">
            {selectedIg?.username || "Not connected"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("ads")}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border p-2.5 text-center transition-all",
            activeTab === "ads"
              ? "border-violet-500/50 bg-violet-500/10 text-foreground shadow-sm ring-1 ring-violet-500/20"
              : "border-border/60 hover:bg-muted/40 text-muted-foreground",
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-violet-500">📊</span>
            <span>3. Meta Ads</span>
          </div>
          <span className="mt-1 text-[10px] text-muted-foreground truncate max-w-full">
            {selectedAd?.id || "Not connected"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("forms")}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border p-2.5 text-center transition-all",
            activeTab === "forms"
              ? "border-emerald-500/50 bg-emerald-500/10 text-foreground shadow-sm ring-1 ring-emerald-500/20"
              : "border-border/60 hover:bg-muted/40 text-muted-foreground",
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-emerald-500">📋</span>
            <span>4. Lead Forms</span>
          </div>
          <span className="mt-1 text-[10px] text-muted-foreground truncate max-w-full">
            {activeFormsCount} Forms Active
          </span>
        </button>
      </div>

      {/* Tab 1: Facebook Page */}
      {activeTab === "pages" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold">Select Facebook Business Page</h4>
              <p className="text-[11px] text-muted-foreground">
                Choose the Facebook Page to link with Teamlio for social posts and inbound messages.
              </p>
            </div>
            <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/30">
              {pages.filter((p) => p.is_selected).length} Selected
            </Badge>
          </div>

          <div className="space-y-2">
            {pages.map((page) => (
              <div
                key={page.id}
                onClick={() => handleSelectPage(page.id)}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all",
                  page.is_selected
                    ? "border-blue-500/60 bg-blue-500/5 ring-1 ring-blue-500/30"
                    : "border-border hover:bg-muted/30",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-blue-600/15 text-blue-500 font-bold">
                    f
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{page.name}</span>
                      {page.is_selected ? (
                        <Badge className="bg-blue-600 text-white text-[10px] py-0 px-1.5">Connected</Badge>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {page.category} • {page.likes?.toLocaleString()} followers • ID: {page.id}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={page.is_selected ? "default" : "outline"}
                  className="text-xs h-7 px-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPage(page.id);
                  }}
                >
                  {page.is_selected ? "Active Page" : "Select"}
                </Button>
              </div>
            ))}
          </div>

          {/* Connect Another Page */}
          <div className="pt-2">
            <Label className="text-xs font-medium">Connect Another Facebook Page</Label>
            <div className="mt-1 flex gap-2">
              <Input
                placeholder="Enter Facebook Page Name or Page URL..."
                value={customPageName}
                onChange={(e) => setCustomPageName(e.target.value)}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddCustomPage}
                className="h-8 text-xs gap-1.5 shrink-0"
              >
                <Plus className="size-3" />
                <span>Add Page</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Instagram Page */}
      {activeTab === "instagram" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold">Select Connected Instagram Profile</h4>
              <p className="text-[11px] text-muted-foreground">
                Instagram Professional accounts linked to your Facebook Business Page.
              </p>
            </div>
            <Badge variant="outline" className="text-xs text-pink-400 border-pink-500/30">
              {instagram.filter((i) => i.is_selected).length} Connected
            </Badge>
          </div>

          <div className="space-y-2">
            {instagram.map((ig) => (
              <div
                key={ig.id}
                onClick={() => handleSelectInstagram(ig.id)}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all",
                  ig.is_selected
                    ? "border-pink-500/60 bg-pink-500/5 ring-1 ring-pink-500/30"
                    : "border-border hover:bg-muted/30",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-pink-600/15 text-pink-500 font-bold">
                    📷
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{ig.username}</span>
                      {ig.is_selected ? (
                        <Badge className="bg-pink-600 text-white text-[10px] py-0 px-1.5">Active</Badge>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {ig.name} • {ig.followers?.toLocaleString()} followers
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={ig.is_selected ? "default" : "outline"}
                  className="text-xs h-7 px-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectInstagram(ig.id);
                  }}
                >
                  {ig.is_selected ? "Active" : "Select"}
                </Button>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 text-[11px] text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
            <span>
              Connected Instagram accounts will sync DMs directly into your Teamlio Unified Lead Inbox.
            </span>
          </div>
        </div>
      )}

      {/* Tab 3: Meta Ads */}
      {activeTab === "ads" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold">Meta Ads Account & Pixel</h4>
              <p className="text-[11px] text-muted-foreground">
                Select your Meta Ads Account for live campaign spend, cost-per-lead, and click analytics.
              </p>
            </div>
            <Badge variant="outline" className="text-xs text-violet-400 border-violet-500/30">
              {adAccounts.filter((a) => a.is_selected).length} Active
            </Badge>
          </div>

          <div className="space-y-2">
            {adAccounts.map((ad) => (
              <div
                key={ad.id}
                onClick={() => handleSelectAdAccount(ad.id)}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all",
                  ad.is_selected
                    ? "border-violet-500/60 bg-violet-500/5 ring-1 ring-violet-500/30"
                    : "border-border hover:bg-muted/30",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-violet-600/15 text-violet-500 font-bold">
                    📊
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{ad.name}</span>
                      {ad.is_selected ? (
                        <Badge className="bg-violet-600 text-white text-[10px] py-0 px-1.5">Connected</Badge>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      ID: {ad.id} • Currency: {ad.currency}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={ad.is_selected ? "default" : "outline"}
                  className="text-xs h-7 px-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectAdAccount(ad.id);
                  }}
                >
                  {ad.is_selected ? "Active" : "Select"}
                </Button>
              </div>
            ))}
          </div>

          <div className="grid gap-2 pt-1">
            <Label className="text-xs font-medium">Meta Pixel ID (Optional)</Label>
            <Input
              placeholder="e.g. 928374650192834"
              value={config.pixel_id || ""}
              onChange={(e) => onChange({ ...config, pixel_id: e.target.value })}
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>
      )}

      {/* Tab 4: Lead Forms */}
      {activeTab === "forms" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold">Instant Lead Generation Forms</h4>
              <p className="text-[11px] text-muted-foreground">
                Automatically capture leads from Facebook & Instagram lead ads and save directly into CRM Leads.
              </p>
            </div>
            <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">
              {activeFormsCount} Forms Syncing
            </Badge>
          </div>

          <div className="space-y-2">
            {leadForms.map((form) => (
              <div
                key={form.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 transition-all",
                  form.is_sync_enabled
                    ? "border-emerald-500/60 bg-emerald-500/5 ring-1 ring-emerald-500/30"
                    : "border-border bg-card/60",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-500 font-bold">
                    📋
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{form.name}</span>
                      {form.is_sync_enabled ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5">Auto-Syncing</Badge>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {form.leads_count} leads captured • Created {form.created_time} • Dest: CRM Leads
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground">
                    {form.is_sync_enabled ? "Sync On" : "Sync Off"}
                  </span>
                  <Switch
                    checked={form.is_sync_enabled}
                    onCheckedChange={(checked) => handleToggleLeadForm(form.id, checked)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 text-[11px] text-muted-foreground">
            <p className="font-semibold text-foreground">Automatic Field Mapping to CRM Leads:</p>
            <div className="mt-1 grid grid-cols-2 gap-1 text-[11px]">
              <div>• Full Name → Lead Name</div>
              <div>• Email Address → Lead Email</div>
              <div>• Phone Number → Lead Phone</div>
              <div>• Company Name → Lead Company</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
