export type IntegrationKey =
  | "meta"
  | "whatsapp"
  | "stripe"
  | "email"
  | "storage"
  | "calendar";

export interface FacebookPageAsset {
  id: string;
  name: string;
  category: string;
  likes?: number;
  is_selected: boolean;
  connected_at?: string;
}

export interface InstagramAccountAsset {
  id: string;
  username: string;
  name: string;
  followers?: number;
  profile_picture?: string;
  is_selected: boolean;
  connected_at?: string;
}

export interface MetaAdAccountAsset {
  id: string;
  name: string;
  currency: string;
  account_status: number;
  is_selected: boolean;
  connected_at?: string;
}

export interface MetaLeadFormAsset {
  id: string;
  name: string;
  leads_count: number;
  created_time: string;
  is_sync_enabled: boolean;
  destination: "crm_leads";
}

export interface MetaConfig {
  app_id?: string;
  app_secret?: string;
  api_version?: string;
  page_id?: string;
  page_name?: string;
  ad_account_id?: string;
  pixel_id?: string;
  sync_leads: boolean;
  sync_campaigns: boolean;
  sync_frequency?: string;
  account_name?: string;
  // Discrete options requested by user:
  facebook_pages: FacebookPageAsset[];
  instagram_accounts: InstagramAccountAsset[];
  ad_accounts: MetaAdAccountAsset[];
  lead_forms: MetaLeadFormAsset[];
  selected_page_name?: string;
  selected_instagram_username?: string;
  selected_ad_account_id?: string;
  active_lead_forms_count?: number;
}

export interface WhatsAppConfig {
  waba_id: string;
  phone_number_id: string;
  phone_number: string;
  access_token: string;
  webhook_verify_token: string;
  webhook_url: string;
  auto_create_leads: boolean;
  welcome_message: string;
  default_country_code: string;
}

export interface StripeConfig {
  provider: "stripe" | "razorpay" | "paypal";
  publishable_key: string;
  secret_key: string;
  webhook_secret: string;
  currency: string;
  mode: "test" | "live";
  auto_receipts: boolean;
  statement_descriptor: string;
}

export interface EmailConfig {
  provider: "resend" | "sendgrid" | "postmark" | "smtp";
  api_key: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string;
  encryption?: "tls" | "ssl" | "none";
  from_name: string;
  from_email: string;
  reply_to: string;
  verified_domain?: string;
}

export interface StorageConfig {
  provider: "supabase" | "s3" | "r2" | "gcs";
  bucket_name: string;
  region: string;
  access_key_id: string;
  secret_access_key: string;
  endpoint_url?: string;
  cdn_domain?: string;
}

export interface CalendarConfig {
  provider: "google" | "outlook" | "caldav";
  account_email: string;
  client_id: string;
  calendar_id: string;
  sync_direction: "two_way" | "one_way";
  default_duration: number;
  auto_video_link: boolean;
}

export interface IntegrationState<T = Record<string, unknown>> {
  key: IntegrationKey;
  connected: boolean;
  connected_at?: string;
  last_sync_at?: string;
  last_test_at?: string;
  config: T;
}

export interface WorkspaceIntegrationsState {
  meta: IntegrationState<MetaConfig>;
  whatsapp: IntegrationState<WhatsAppConfig>;
  stripe: IntegrationState<StripeConfig>;
  email: IntegrationState<EmailConfig>;
  storage: IntegrationState<StorageConfig>;
  calendar: IntegrationState<CalendarConfig>;
}

export interface ConnectionTestResult {
  success: boolean;
  latency_ms: number;
  message: string;
  details?: Record<string, string>;
}
