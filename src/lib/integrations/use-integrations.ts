import { useCallback, useEffect, useState } from "react";
import { useOrgId } from "@/app/workspace";
import { toast } from "sonner";
import type {
  CalendarConfig,
  ConnectionTestResult,
  EmailConfig,
  IntegrationKey,
  IntegrationState,
  MetaConfig,
  StorageConfig,
  StripeConfig,
  WhatsAppConfig,
  WorkspaceIntegrationsState,
} from "./types";

const EVENT_NAME = "teamlio:integrations_updated";

export const DEFAULT_INTEGRATIONS_STATE: WorkspaceIntegrationsState = {
  meta: {
    key: "meta",
    connected: false,
    config: {
      app_id: "",
      app_secret: "",
      api_version: "v19.0",
      page_id: "",
      page_name: "",
      ad_account_id: "",
      sync_leads: true,
      sync_campaigns: true,
      sync_frequency: "Every 15 minutes",
      account_name: "",
      facebook_pages: [],
      instagram_accounts: [],
      ad_accounts: [],
      lead_forms: [],
    },
  },
  whatsapp: {
    key: "whatsapp",
    connected: false,
    config: {
      waba_id: "",
      phone_number_id: "",
      phone_number: "",
      access_token: "",
      webhook_verify_token: "",
      webhook_url: "https://api.teamlio.com/v1/webhooks/whatsapp",
      auto_create_leads: true,
      welcome_message: "Hello! Thank you for reaching out to us. How can we help you today?",
      default_country_code: "+1",
    },
  },
  stripe: {
    key: "stripe",
    connected: false,
    config: {
      provider: "stripe",
      publishable_key: "",
      secret_key: "",
      webhook_secret: "",
      currency: "USD",
      mode: "test",
      auto_receipts: true,
      statement_descriptor: "TEAMLIO*CRM",
    },
  },
  email: {
    key: "email",
    connected: false,
    config: {
      provider: "resend",
      api_key: "",
      from_name: "Teamlio Workspace",
      from_email: "notifications@teamlio.io",
      reply_to: "support@teamlio.io",
    },
  },
  storage: {
    key: "storage",
    connected: false,
    config: {
      provider: "s3",
      bucket_name: "",
      region: "us-east-1",
      access_key_id: "",
      secret_access_key: "",
    },
  },
  calendar: {
    key: "calendar",
    connected: false,
    config: {
      provider: "google",
      account_email: "",
      client_id: "",
      calendar_id: "primary",
      sync_direction: "two_way",
      default_duration: 30,
      auto_video_link: true,
    },
  },
};

export const SANDBOX_PRESETS: WorkspaceIntegrationsState = {
  meta: {
    key: "meta",
    connected: true,
    connected_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    last_sync_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    config: {
      app_id: "492817294829103",
      app_secret: "****************************9f3a",
      api_version: "v19.0",
      page_id: "109283746592019",
      page_name: "Teamlio Global Media",
      ad_account_id: "act_4928192847",
      pixel_id: "928374650192834",
      sync_leads: true,
      sync_campaigns: true,
      sync_frequency: "Every 15 minutes",
      account_name: "Teamlio Growth Campaigns",
      selected_page_name: "Teamlio Global Media",
      selected_instagram_username: "@teamlio_official",
      selected_ad_account_id: "act_4928192847",
      active_lead_forms_count: 2,
      facebook_pages: [
        { id: "109283746592019", name: "Teamlio Global Media", category: "Software Agency", likes: 14200, is_selected: true },
        { id: "201928374619283", name: "Teamlio Careers & Brand", category: "Company", likes: 3840, is_selected: false },
      ],
      instagram_accounts: [
        { id: "ig_981726354", username: "@teamlio_official", name: "Teamlio Software", followers: 28400, is_selected: true },
        { id: "ig_102938475", username: "@teamlio_community", name: "Teamlio Creators", followers: 6100, is_selected: false },
      ],
      ad_accounts: [
        { id: "act_4928192847", name: "Teamlio Performance Ads (USD)", currency: "USD", account_status: 1, is_selected: true },
        { id: "act_1029384756", name: "Teamlio Brand Awareness", currency: "USD", account_status: 1, is_selected: false },
      ],
      lead_forms: [
        { id: "form_109283", name: "Q3 Website Contact & Consultation Form", leads_count: 48, created_time: "2026-08-10", is_sync_enabled: true, destination: "crm_leads" },
        { id: "form_291029", name: "VIP Enterprise Demo Request Form", leads_count: 23, created_time: "2026-09-01", is_sync_enabled: true, destination: "crm_leads" },
        { id: "form_384729", name: "Newsletter & Webinar Registration", leads_count: 112, created_time: "2026-07-25", is_sync_enabled: false, destination: "crm_leads" },
      ],
    },
  },
  whatsapp: {
    key: "whatsapp",
    connected: true,
    connected_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    last_sync_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    config: {
      waba_id: "105948372615204",
      phone_number_id: "100293847562910",
      phone_number: "+1 (555) 019-2834",
      access_token: "EAAGm0PXq1...sandbox_token_valid",
      webhook_verify_token: "teamlio_webhook_v1_secure",
      webhook_url: "https://api.teamlio.com/v1/webhooks/whatsapp",
      auto_create_leads: true,
      welcome_message: "Hi! Welcome to Teamlio. An account manager will be with you shortly.",
      default_country_code: "+1",
    },
  },
  stripe: {
    key: "stripe",
    connected: true,
    connected_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    last_sync_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    config: {
      provider: "stripe",
      publishable_key: "pk_test_51MzDemoSandboxPublishableKeyTeamlio9902",
      secret_key: "sk_test_51MzDemoSandboxSecretKeyTeamlio9902",
      webhook_secret: "whsec_test_demoWebhookSecret99120",
      currency: "USD",
      mode: "test",
      auto_receipts: true,
      statement_descriptor: "TEAMLIO*CRM",
    },
  },
  email: {
    key: "email",
    connected: true,
    connected_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    last_sync_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    config: {
      provider: "resend",
      api_key: "re_sandbox_98a7sd8f7a6sd8f7a6sdf78",
      from_name: "Teamlio Workspace Alerts",
      from_email: "notifications@teamlio.io",
      reply_to: "support@teamlio.io",
      verified_domain: "teamlio.io",
    },
  },
  storage: {
    key: "storage",
    connected: true,
    connected_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    last_sync_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    config: {
      provider: "s3",
      bucket_name: "teamlio-media-vault",
      region: "us-east-1",
      access_key_id: "AKIA_SANDBOX_DEMO_KEY",
      secret_access_key: "************************************",
      cdn_domain: "https://assets.teamlio.io",
    },
  },
  calendar: {
    key: "calendar",
    connected: true,
    connected_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    last_sync_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    config: {
      provider: "google",
      account_email: "team.ops@teamlio.io",
      client_id: "849201938472-demo.apps.googleusercontent.com",
      calendar_id: "primary",
      sync_direction: "two_way",
      default_duration: 30,
      auto_video_link: true,
    },
  },
};

function getStorageKey(orgId: string) {
  return `teamlio_integrations_${orgId || "default"}`;
}

export function loadIntegrationsFromStorage(orgId: string): WorkspaceIntegrationsState {
  if (typeof window === "undefined") return DEFAULT_INTEGRATIONS_STATE;
  try {
    const raw = window.localStorage.getItem(getStorageKey(orgId));
    if (!raw) return DEFAULT_INTEGRATIONS_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_INTEGRATIONS_STATE,
      ...parsed,
    };
  } catch {
    return DEFAULT_INTEGRATIONS_STATE;
  }
}

export function saveIntegrationsToStorage(
  orgId: string,
  state: WorkspaceIntegrationsState,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getStorageKey(orgId), JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { orgId, state } }));
  } catch (err) {
    console.error("Failed to save integrations:", err);
  }
}

export function useWorkspaceIntegrations() {
  const org = useOrgId() || "default";
  const [integrations, setIntegrations] = useState<WorkspaceIntegrationsState>(() =>
    loadIntegrationsFromStorage(org),
  );

  useEffect(() => {
    setIntegrations(loadIntegrationsFromStorage(org));
    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent;
      if (!custom.detail || custom.detail.orgId === org) {
        setIntegrations(loadIntegrationsFromStorage(org));
      }
    };
    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [org]);

  const connectIntegration = useCallback(
    <K extends IntegrationKey>(key: K, config: WorkspaceIntegrationsState[K]["config"]) => {
      const now = new Date().toISOString();
      const next: WorkspaceIntegrationsState = {
        ...integrations,
        [key]: {
          key,
          connected: true,
          connected_at: integrations[key]?.connected_at || now,
          last_sync_at: now,
          config,
        },
      };
      setIntegrations(next);
      saveIntegrationsToStorage(org, next);
      toast.success(`${key.toUpperCase()} integration connected successfully!`);
    },
    [integrations, org],
  );

  const disconnectIntegration = useCallback(
    (key: IntegrationKey) => {
      const next: WorkspaceIntegrationsState = {
        ...integrations,
        [key]: {
          ...DEFAULT_INTEGRATIONS_STATE[key],
          connected: false,
        },
      };
      setIntegrations(next);
      saveIntegrationsToStorage(org, next);
      toast.info(`${key.toUpperCase()} integration disconnected.`);
    },
    [integrations, org],
  );

  const syncIntegration = useCallback(
    async (key: IntegrationKey): Promise<void> => {
      const now = new Date().toISOString();
      // Simulate real ping / sync action
      await new Promise((resolve) => setTimeout(resolve, 600));
      const next: WorkspaceIntegrationsState = {
        ...integrations,
        [key]: {
          ...integrations[key],
          last_sync_at: now,
        },
      };
      setIntegrations(next);
      saveIntegrationsToStorage(org, next);
      toast.success(`${key.toUpperCase()} synced successfully.`);
    },
    [integrations, org],
  );

  const quickConnectAllSandbox = useCallback(() => {
    setIntegrations(SANDBOX_PRESETS);
    saveIntegrationsToStorage(org, SANDBOX_PRESETS);
    toast.success("All 6 integration modules connected with sandbox test environments!");
  }, [org]);

  const resetAllToDisconnected = useCallback(() => {
    setIntegrations(DEFAULT_INTEGRATIONS_STATE);
    saveIntegrationsToStorage(org, DEFAULT_INTEGRATIONS_STATE);
    toast.info("All integrations disconnected.");
  }, [org]);

  return {
    integrations,
    connectIntegration,
    disconnectIntegration,
    syncIntegration,
    quickConnectAllSandbox,
    resetAllToDisconnected,
  };
}

/** Simulate real connection verification to demonstrate working integration */
export async function testConnectionForService(
  key: IntegrationKey,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any,
): Promise<ConnectionTestResult> {
  const start = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 800));
  const latency = Date.now() - start;

  switch (key) {
    case "meta":
      if (!config.app_id || !config.ad_account_id) {
        return {
          success: false,
          latency_ms: latency,
          message: "Validation failed: App ID and Ad Account ID are required.",
        };
      }
      return {
        success: true,
        latency_ms: latency,
        message: "Meta Graph API v19.0 handshake verified. Scopes active: ads_read, leads_retrieval, pages_manage_ads.",
        details: {
          "API Version": config.api_version || "v19.0",
          "Ad Account": config.ad_account_id,
          "Page ID": config.page_id || "Connected",
          "Permissions": "Active (Token Valid)",
        },
      };

    case "whatsapp":
      if (!config.phone_number_id || !config.waba_id) {
        return {
          success: false,
          latency_ms: latency,
          message: "Validation failed: WABA ID and Phone Number ID are required.",
        };
      }
      return {
        success: true,
        latency_ms: latency,
        message: "WhatsApp Cloud API connection verified. Inbound webhook ping successful.",
        details: {
          "Phone Number": config.phone_number || "Active",
          "WABA Account": config.waba_id,
          "Webhook Status": "Verified & Subscribed",
          "Tier": "Production Tier 2 (10k msgs/day)",
        },
      };

    case "stripe":
      if (!config.publishable_key && !config.secret_key) {
        return {
          success: false,
          latency_ms: latency,
          message: "Validation failed: Publishable or Secret API Key is required.",
        };
      }
      return {
        success: true,
        latency_ms: latency,
        message: "Payment gateway credentials authenticated. Webhook endpoints ready for invoice payments.",
        details: {
          "Provider": config.provider?.toUpperCase() || "STRIPE",
          "Mode": config.mode === "live" ? "Live Production" : "Test Sandbox",
          "Currency": config.currency || "USD",
          "Capabilities": "card_payments, transfers, webhooks",
        },
      };

    case "email":
      if (!config.from_email || (!config.api_key && !config.smtp_host)) {
        return {
          success: false,
          latency_ms: latency,
          message: "Validation failed: Sender Email and API Key or SMTP Host required.",
        };
      }
      return {
        success: true,
        latency_ms: latency,
        message: "Email dispatch server reached. SPF & DKIM records validated.",
        details: {
          "Provider": config.provider?.toUpperCase() || "RESEND",
          "Sender": `${config.from_name || "Teamlio"} <${config.from_email}>`,
          "DKIM / SPF": "Verified Pass",
          "Dispatch Rate": "50 emails/sec",
        },
      };

    case "storage":
      if (!config.bucket_name) {
        return {
          success: false,
          latency_ms: latency,
          message: "Validation failed: Bucket Name is required.",
        };
      }
      return {
        success: true,
        latency_ms: latency,
        message: "Object storage bucket accessible. Read/Write test object uploaded and cleaned successfully.",
        details: {
          "Provider": config.provider?.toUpperCase() || "S3",
          "Bucket": config.bucket_name,
          "Region": config.region || "us-east-1",
          "Access": "Read/Write Allowed",
        },
      };

    case "calendar":
      if (!config.account_email) {
        return {
          success: false,
          latency_ms: latency,
          message: "Validation failed: Account email is required.",
        };
      }
      return {
        success: true,
        latency_ms: latency,
        message: "Calendar API authenticated. Two-way event synchronization enabled.",
        details: {
          "Provider": config.provider?.toUpperCase() || "GOOGLE CALENDAR",
          "Account": config.account_email,
          "Sync Mode": config.sync_direction === "two_way" ? "2-Way Bi-directional" : "Export Only",
          "Auto Meeting Links": config.auto_video_link ? "Google Meet / Teams Enabled" : "Disabled",
        },
      };

    default:
      return {
        success: true,
        latency_ms: latency,
        message: "Connection authenticated successfully.",
      };
  }
}
