import type { Permission } from "@/lib/permissions";
import {
  Activity,
  BarChart3,
  Bell,
  BookTemplate,
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarRange,
  CircleDollarSign,
  ClipboardList,
  Contact,
  FileStack,
  FileText,
  FolderKanban,
  Gauge,
  GitBranch,
  Handshake,
  Inbox,
  Images,
  LayoutDashboard,
  Layers,
  LineChart,
  ListChecks,
  Mail,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Milestone,
  Plug,
  Receipt,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  SquareKanban,
  Target,
  Timer,
  Trello,
  Users,
  UserCog,
  UserPlus,
  Wallet,
  Workflow,
  type LucideIcon,
  UserRound,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permission?: Permission;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Dashboard",
    items: [
      { label: "Overview", to: "/", icon: LayoutDashboard },
      { label: "Live Dashboard", to: "/admin/dashboard", icon: BarChart3 },
    ],
  },
  {
    label: "Projects",
    items: [
      { label: "Live Projects", to: "/work/projects", icon: FolderKanban },
      { label: "Live Tasks", to: "/work/tasks", icon: ListChecks },
      { label: "Project Documents", to: "/work/documents", icon: FileStack },
      { label: "All Projects", to: "/projects", icon: FolderKanban, permission: "project.read" },
      { label: "My Projects", to: "/projects/my", icon: Briefcase, permission: "project.read" },
      { label: "Tasks", to: "/tasks", icon: ListChecks, permission: "task.read" },
      { label: "Kanban", to: "/kanban", icon: Trello, permission: "task.read" },
      { label: "Timeline", to: "/timeline", icon: GitBranch, permission: "task.read" },
      { label: "Milestones", to: "/milestones", icon: Milestone, permission: "project.read" },
      { label: "Project Templates", to: "/project-templates", icon: BookTemplate, permission: "project.read" },
    ],
  },
  {
    label: "CRM",
    items: [
      { label: "Leads", to: "/crm/leads", icon: Target, permission: "lead.read" },
      { label: "Clients", to: "/crm/clients", icon: Building2, permission: "client.read" },
      { label: "Contacts", to: "/crm/contacts", icon: Contact, permission: "client.read" },
      { label: "Companies", to: "/crm/companies", icon: Layers, permission: "client.read" },
      { label: "Deals", to: "/crm/deals", icon: Handshake, permission: "deal.read" },
      { label: "Pipeline", to: "/crm/pipeline", icon: SquareKanban, permission: "deal.read" },
    ],
  },
  {
    label: "Teams",
    items: [
      { label: "Teams", to: "/teams", icon: Users, permission: "team.read" },
      { label: "Users", to: "/users", icon: UserCog, permission: "user.read" },
      { label: "Daily Work Update", to: "/daily-updates", icon: ClipboardList, permission: "daily_update.read" },
      { label: "Leave Management", to: "/leave", icon: CalendarRange, permission: "leave.read" },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Internal Chat", to: "/chat", icon: MessagesSquare, permission: "chat.access" },
      { label: "Meetings", to: "/meetings", icon: Timer, permission: "meeting.manage" },
      { label: "Calendar", to: "/calendar", icon: CalendarDays },
      { label: "Notifications", to: "/notifications", icon: Bell },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Social Overview", to: "/marketing", icon: Megaphone, permission: "marketing.read" },
      { label: "Content Calendar", to: "/marketing/content-calendar", icon: CalendarDays, permission: "marketing.read" },
      { label: "Content Library", to: "/marketing/content-library", icon: Images, permission: "marketing.read" },
      { label: "Scheduled Content", to: "/marketing/scheduled", icon: Send, permission: "marketing.read" },
      { label: "Campaigns", to: "/marketing/campaigns", icon: Activity, permission: "marketing.read" },
      { label: "Meta Ads", to: "/marketing/meta", icon: BarChart3, permission: "marketing.read" },
      { label: "Meta Leads", to: "/marketing/meta-leads", icon: UserPlus, permission: "marketing.read" },
      { label: "WhatsApp", to: "/marketing/whatsapp", icon: MessageCircle, permission: "marketing.read" },
      { label: "Unified Lead Inbox", to: "/marketing/inbox", icon: Inbox, permission: "marketing.read" },
      { label: "Marketing Reports", to: "/marketing/reports", icon: LineChart, permission: "marketing.read" },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Quotations", to: "/business/quotations", icon: FileText, permission: "quotation.create" },
      { label: "Invoices", to: "/business/invoices", icon: Receipt, permission: "invoice.read" },
      { label: "Payments", to: "/business/payments", icon: CircleDollarSign, permission: "payment.manage" },
      { label: "Expenses", to: "/business/expenses", icon: Wallet, permission: "expense.manage" },
    ],
  },
  {
    label: "Files",
    items: [{ label: "File Manager", to: "/files", icon: FileStack, permission: "file.manage" }],
  },
  {
    label: "Reports",
    items: [
      { label: "Project Reports", to: "/reports/projects", icon: Gauge, permission: "report.read" },
      { label: "Team Reports", to: "/reports/teams", icon: Users, permission: "report.read" },
      { label: "CRM Reports", to: "/reports/crm", icon: Target, permission: "report.read" },
      { label: "Analytics", to: "/analytics", icon: LineChart, permission: "report.read" },
    ],
  },
  {
    label: "Automation",
    items: [
      { label: "AI Assistant", to: "/ai-assistant", icon: Bot },
      { label: "Workflows", to: "/automation", icon: Workflow, permission: "automation.manage" },
      { label: "Templates", to: "/automation/templates", icon: BookTemplate, permission: "automation.manage" },
      { label: "Execution Logs", to: "/automation/logs", icon: ScrollText, permission: "automation.manage" },
      { label: "AI Usage", to: "/automation/ai-usage", icon: Activity, permission: "automation.manage" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Workspace Admin", to: "/admin/workspace", icon: Building2 },
      { label: "Workspace Settings", to: "/settings/workspace", icon: Settings },
      { label: "My Profile", to: "/admin/profile", icon: UserRound },
      { label: "Employees", to: "/admin/employees", icon: Users, permission: "user.read" },
      { label: "User Management", to: "/admin/users", icon: UserCog, permission: "user.manage" },
      { label: "Roles & Permissions", to: "/admin/roles", icon: ShieldCheck, permission: "user.manage" },
      { label: "Teams Management", to: "/admin/teams", icon: Users, permission: "team.manage" },
      { label: "Integrations", to: "/admin/integrations", icon: Plug, permission: "admin.access" },
      { label: "API & Webhooks", to: "/admin/api", icon: Mail, permission: "admin.access" },
      { label: "Audit Logs", to: "/admin/audit", icon: ScrollText, permission: "audit.read" },
      { label: "Settings", to: "/settings", icon: Settings, permission: "settings.manage" },
    ],
  },
];
