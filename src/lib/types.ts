/**
 * Core domain types. These mirror the future relational schema:
 * every business entity carries id / organization_id / created_at / updated_at.
 */

export type ID = string;

export interface BaseEntity {
  id: ID;
  organization_id: ID;
  created_at: string;
  updated_at: string;
}

/* ---------------------------------- org --------------------------------- */

export interface Organization {
  id: ID;
  name: string;
  slug: string;
  currency?: string;
  timezone?: string;
  logo_url?: string | null;
  owner_user_id?: string;
  plan?: string;
  billing_email?: string;
  max_members?: number;
  address?: string;
  created_at: string;
  updated_at: string;
}

export type UserStatus = "Invited" | "Active" | "Inactive" | "Suspended" | "Locked";

export interface User extends BaseEntity {
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  job_title: string;
  role_id: ID;
  status: UserStatus;
  last_login_at: string | null;
}

export interface Role extends BaseEntity {
  name: string;
  description: string;
  is_system: boolean;
  permissions: string[];
}

export interface OrganizationMember extends BaseEntity {
  user_id: ID;
  role_id: ID;
}

/* --------------------------------- teams -------------------------------- */

export interface Team extends BaseEntity {
  name: string;
  description: string;
  lead_user_id: ID;
  status: "Active" | "Inactive";
  color: string;
}

export interface TeamMember extends BaseEntity {
  team_id: ID;
  user_id: ID;
  role_in_team: string;
}

export type TeamMemberRequestStatus = "pending" | "approved" | "rejected";

export interface TeamMemberRequest extends BaseEntity {
  team_id: ID;
  user_id: ID;
  role_in_team: string;
  status: TeamMemberRequestStatus;
  message: string;
  reviewed_by?: ID | null;
  reviewed_at?: string | null;
  user?: User;
  team?: Team;
}

/* ---------------------------------- crm --------------------------------- */

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Proposal"
  | "Negotiation"
  | "Won"
  | "Lost";

export type LeadSource =
  | "Manual"
  | "Website"
  | "Facebook"
  | "Instagram"
  | "WhatsApp"
  | "Referral"
  | "Campaign"
  | "Other";

export interface Lead extends BaseEntity {
  code: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: LeadSource;
  assigned_user_id: ID;
  status: LeadStatus;
  estimated_value: number;
  last_activity_at: string;
  tags: string[];
  notes: string;
  converted_client_id: ID | null;
}

export type ClientStatus = "Active" | "Prospect" | "Inactive" | "Churned";

export interface Client extends BaseEntity {
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  owner_user_id: ID;
  status: ClientStatus;
  industry: string;
  tags?: string[];
  notes?: string;
}

export interface Contact extends BaseEntity {
  client_id: ID;
  full_name: string;
  email: string;
  phone: string;
  designation: string;
  is_primary: boolean;
}

export type DealStage =
  | "New Opportunity"
  | "Qualified"
  | "Proposal"
  | "Negotiation"
  | "Won"
  | "Lost";

export interface Deal extends BaseEntity {
  title: string;
  lead_id: ID | null;
  client_id: ID | null;
  value: number;
  probability: number;
  pipeline: string;
  stage: DealStage;
  expected_close_date: string;
  owner_user_id: ID;
  notes?: string;
}

/* -------------------------------- projects ------------------------------- */

export type ProjectStatus =
  | "Draft"
  | "Planned"
  | "In Progress"
  | "Under Review"
  | "On Hold"
  | "Completed"
  | "Cancelled"
  | "Overdue"
  | "Archived";

export type Priority = "Low" | "Medium" | "High" | "Urgent";

export interface Project extends BaseEntity {
  code: string;
  name: string;
  description: string;
  client_id: ID;
  client_name?: string;
  manager_user_id: ID;
  manager_name?: string;
  team_ids: ID[];
  start_date: string;
  due_date: string;
  status: ProjectStatus;
  priority: Priority;
  progress: number;
  budget: number;
  spent: number;
  health: "On Track" | "At Risk" | "Off Track";
  template_id: ID | null;
}

export interface ProjectMember extends BaseEntity {
  project_id: ID;
  user_id: ID;
  role_in_project: string;
}

export type MilestoneStatus = "Upcoming" | "In Progress" | "Completed" | "Overdue";

export interface Milestone extends BaseEntity {
  project_id: ID;
  name: string;
  description: string;
  due_date: string;
  team_id: ID | null;
  progress: number;
  status: MilestoneStatus;
  deliverables: string[];
}

export interface ProjectTemplate extends BaseEntity {
  name: string;
  category: string;
  description: string;
  default_duration_days: number;
  task_titles: string[];
  milestone_titles: string[];
  workflow_stages: string[];
}

/* --------------------------------- tasks -------------------------------- */

export type TaskStatus =
  | "Backlog"
  | "To Do"
  | "In Progress"
  | "Review"
  | "Completed"
  | "Blocked";

export interface ChecklistItem {
  id: ID;
  title: string;
  done: boolean;
}

export interface Task extends BaseEntity {
  code: string;
  title: string;
  description: string;
  project_id: ID;
  assignee_ids: ID[];
  team_id: ID | null;
  reporter_id: ID;
  follower_ids: ID[];
  priority: Priority;
  status: TaskStatus;
  start_date: string;
  due_date: string;
  progress: number;
  checklist: ChecklistItem[];
  parent_task_id: ID | null;
  dependency_ids: ID[];
  labels: string[];
  attachment_ids: ID[];
  milestone_id: ID | null;
}

export interface Comment extends BaseEntity {
  entity_type: string;
  entity_id: ID;
  author_id: ID;
  body: string;
}

/* ----------------------------- daily / leave ----------------------------- */

export type DailyUpdateStatus = "Draft" | "Submitted" | "Late" | "Missing" | "Reviewed";

export interface DailyWorkUpdate extends BaseEntity {
  user_id: ID;
  date: string;
  completed_today: string;
  working_on: string;
  next_plan: string;
  blockers: string;
  project_id: ID | null;
  task_ids: ID[];
  status: DailyUpdateStatus;
  submitted_at: string | null;
}

export type LeaveStatus = "Draft" | "Pending" | "Approved" | "Rejected" | "Cancelled";

export interface LeaveRequest extends BaseEntity {
  user_id: ID;
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  half_day: boolean;
  reason: string;
  approver_id: ID;
  status: LeaveStatus;
}

export interface LeaveBalance {
  leave_type: string;
  entitled: number;
  used: number;
  pending: number;
}

/* ---------------------------- comms & calendar --------------------------- */

export type MeetingType = "Internal" | "Project" | "Client" | "Sales";

export interface Meeting extends BaseEntity {
  title: string;
  type: MeetingType;
  participant_ids: ID[];
  client_id: ID | null;
  project_id: ID | null;
  date: string;
  start_time: string;
  end_time: string;
  meeting_url: string;
  location: string;
  agenda: string;
  notes: string;
  status: "Scheduled" | "Completed" | "Cancelled";
}

export interface ChatRoom extends BaseEntity {
  name: string;
  type: "Direct" | "Group" | "Team" | "Project" | "Client";
  member_ids: ID[];
  project_id: ID | null;
  last_message_at: string;
  unread_count: number;
}

export interface ChatMessage extends BaseEntity {
  room_id: ID;
  author_id: ID;
  body: string;
  reply_to_id: ID | null;
  reactions: { emoji: string; user_ids: ID[] }[];
  pinned: boolean;
  read_by: ID[];
  attachment_name?: string;
}

export type NotificationType =
  | "Task Assigned"
  | "Project Deadline"
  | "Task Overdue"
  | "Meeting Reminder"
  | "Mention"
  | "Daily Update Reminder"
  | "Leave Approval"
  | "Invoice Alert"
  | "Content Approval"
  | "Publishing Failure"
  | "System Alert";

export interface AppNotification extends BaseEntity {
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
}

/* -------------------------------- business ------------------------------- */

export interface LineItem {
  id: ID;
  description: string;
  quantity: number;
  rate: number;
}

export type QuotationStatus = "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired";

export interface Quotation extends BaseEntity {
  number: string;
  client_id: ID;
  project_id: ID | null;
  items: LineItem[];
  discount: number;
  tax_rate: number;
  terms: string;
  expiry_date: string;
  status: QuotationStatus;
}

export type InvoiceStatus =
  | "Draft"
  | "Sent"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Cancelled";

export interface Invoice extends BaseEntity {
  number: string;
  client_id: ID;
  project_id: ID | null;
  quotation_id: ID | null;
  items: LineItem[];
  discount: number;
  tax_rate: number;
  paid_amount: number;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
}

export interface Payment extends BaseEntity {
  invoice_id: ID;
  client_id: ID;
  amount: number;
  method: "Bank Transfer" | "Card" | "Cash" | "Mobile Banking" | "Cheque";
  reference: string;
  payment_date: string;
  status: "Pending" | "Completed" | "Failed";
  notes: string;
}

export interface Expense extends BaseEntity {
  project_id: ID | null;
  category: string;
  vendor: string;
  amount: number;
  date: string;
  status: "Pending" | "Approved" | "Rejected";
  notes: string;
}

/* --------------------------------- files --------------------------------- */

export interface FileRecord extends BaseEntity {
  name: string;
  folder: string;
  mime_type: string;
  size_kb: number;
  uploader_id: ID;
  project_id: ID | null;
  client_id: ID | null;
  task_id: ID | null;
  shared: boolean;
}

/* ------------------------------- marketing ------------------------------- */

export type ContentStatus =
  | "Idea"
  | "Planned"
  | "In Progress"
  | "Designing"
  | "Review"
  | "Changes Requested"
  | "Approved"
  | "Scheduled"
  | "Publishing"
  | "Published"
  | "Failed"
  | "Cancelled";

export type ContentType =
  | "Static Post"
  | "Carousel"
  | "Reel"
  | "Story"
  | "Short Video"
  | "Long Video"
  | "Link Post"
  | "Campaign Creative";

export interface ContentItem extends BaseEntity {
  title: string;
  caption: string;
  content_type: ContentType;
  platform: "Facebook" | "Instagram" | "LinkedIn" | "YouTube" | "TikTok";
  campaign_id: ID | null;
  client_id: ID | null;
  hashtags: string[];
  cta: string;
  destination_url: string;
  writer_id: ID | null;
  designer_id: ID | null;
  reviewer_id: ID | null;
  approver_id: ID | null;
  publish_date: string;
  publish_time: string;
  timezone: string;
  status: ContentStatus;
}

export interface Campaign extends BaseEntity {
  name: string;
  client_id: ID | null;
  objective: string;
  status: "Active" | "Paused" | "Completed" | "Draft";
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
  start_date: string;
  end_date: string;
}

export interface MetaLead extends BaseEntity {
  full_name: string;
  email: string;
  phone: string;
  campaign_id: ID;
  ad_name: string;
  ad_set_name: string;
  lead_form: string;
  assigned_user_id: ID | null;
  crm_status: "New" | "Assigned" | "Converted" | "Rejected";
}

export type ScheduleStatus =
  | "Waiting"
  | "Processing"
  | "Publishing"
  | "Published"
  | "Retrying"
  | "Failed"
  | "Cancelled";

export interface ScheduledContent extends BaseEntity {
  content_id: ID;
  platform: string;
  account: string;
  scheduled_at: string;
  status: ScheduleStatus;
  attempts: number;
  result: string;
}

export interface Conversation extends BaseEntity {
  channel: "WhatsApp" | "Instagram" | "Facebook";
  contact_name: string;
  contact_phone: string;
  last_message: string;
  last_message_at: string;
  unread: number;
  assigned_user_id: ID | null;
  lead_id: ID | null;
}

export interface ConversationMessage extends BaseEntity {
  conversation_id: ID;
  direction: "in" | "out";
  body: string;
  sent_at: string;
}

/* ------------------------------- automation ------------------------------ */

export interface AutomationWorkflow extends BaseEntity {
  name: string;
  description: string;
  trigger: string;
  conditions: { field: string; operator: string; value: string }[];
  actions: { type: string; config: string }[];
  enabled: boolean;
  runs: number;
  last_run_at: string | null;
}

export interface ExecutionLog extends BaseEntity {
  workflow_id: ID;
  status: "Success" | "Failed" | "Skipped";
  message: string;
  duration_ms: number;
  ran_at: string;
}

export interface AuditLog extends BaseEntity {
  user_id: ID;
  action: string;
  entity_type: string;
  entity_label: string;
  old_value: string;
  new_value: string;
  ip: string;
  status: "Success" | "Failed";
}

/* ------------------------------- activity -------------------------------- */

export interface ActivityEvent extends BaseEntity {
  entity_type: string;
  entity_id: ID;
  actor_id: ID;
  action: string;
  detail: string;
}
