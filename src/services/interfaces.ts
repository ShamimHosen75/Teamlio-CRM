import type {
  ActivityEvent,
  AppNotification,
  AuditLog,
  AutomationWorkflow,
  Campaign,
  ChatMessage,
  ChatRoom,
  Client,
  Comment,
  Contact,
  ContentItem,
  Conversation,
  ConversationMessage,
  DailyWorkUpdate,
  Deal,
  Expense,
  ExecutionLog,
  FileRecord,
  Invoice,
  Lead,
  LeaveBalance,
  LeaveRequest,
  Meeting,
  MetaLead,
  Milestone,
  Payment,
  Project,
  ProjectTemplate,
  Quotation,
  Role,
  ScheduledContent,
  Task,
  Team,
  User,
} from "@/lib/types";

/** Every service is organization-scoped so the app is multi-tenant ready. */
export interface ProjectService {
  getProjects(organizationId: string): Promise<Project[]>;
  getProject(organizationId: string, id: string): Promise<Project | undefined>;
  createProject(organizationId: string, input: Partial<Project>): Promise<Project>;
  updateProject(organizationId: string, id: string, input: Partial<Project>): Promise<Project>;
  archiveProject(organizationId: string, id: string): Promise<Project>;
  getMilestones(organizationId: string, projectId?: string): Promise<Milestone[]>;
  getTemplates(organizationId: string): Promise<ProjectTemplate[]>;
}

export interface TaskService {
  getTasks(organizationId: string, projectId?: string): Promise<Task[]>;
  getTask(organizationId: string, id: string): Promise<Task | undefined>;
  createTask(organizationId: string, input: Partial<Task>): Promise<Task>;
  updateTask(organizationId: string, id: string, input: Partial<Task>): Promise<Task>;
  assignTask(organizationId: string, id: string, userIds: string[]): Promise<Task>;
  getComments(organizationId: string, entityId: string): Promise<Comment[]>;
}

export interface CRMService {
  getLeads(organizationId: string): Promise<Lead[]>;
  getLead(organizationId: string, id: string): Promise<Lead | undefined>;
  createLead(organizationId: string, input: Partial<Lead>): Promise<Lead>;
  updateLead(organizationId: string, id: string, input: Partial<Lead>): Promise<Lead>;
  convertLead(
    organizationId: string,
    id: string,
    options: { createClient: boolean; createProject: boolean; templateId?: string; managerId?: string; startDate?: string; dueDate?: string },
  ): Promise<{ client?: Client; project?: Project }>;
  getClients(organizationId: string): Promise<Client[]>;
  createClient(organizationId: string, input: Partial<Client>): Promise<Client>;
  getClient(organizationId: string, id: string): Promise<Client | undefined>;
  getContacts(organizationId: string, clientId?: string): Promise<Contact[]>;
  getDeals(organizationId: string): Promise<Deal[]>;
  createDeal(organizationId: string, input: Partial<Deal>): Promise<Deal>;
  updateDeal(organizationId: string, id: string, input: Partial<Deal>): Promise<Deal>;
}

export interface PeopleService {
  getUsers(organizationId: string): Promise<User[]>;
  getRoles(organizationId: string): Promise<Role[]>;
  getTeams(organizationId: string): Promise<Team[]>;
  getTeamMembers(organizationId: string, teamId?: string): Promise<{ user: User; role_in_team: string }[]>;
  getDailyUpdates(organizationId: string, date?: string): Promise<DailyWorkUpdate[]>;
  createDailyUpdate(organizationId: string, input: Partial<DailyWorkUpdate>): Promise<DailyWorkUpdate>;
  getLeaveRequests(organizationId: string): Promise<LeaveRequest[]>;
  createLeaveRequest(organizationId: string, input: Partial<LeaveRequest>): Promise<LeaveRequest>;
  updateLeaveRequest(organizationId: string, id: string, input: Partial<LeaveRequest>): Promise<LeaveRequest>;
  getLeaveBalance(organizationId: string, userId: string): Promise<LeaveBalance[]>;
}

export interface CommunicationService {
  getMeetings(organizationId: string): Promise<Meeting[]>;
  createMeeting(organizationId: string, input: Partial<Meeting>): Promise<Meeting>;
  getChatRooms(organizationId: string): Promise<ChatRoom[]>;
  getChatMessages(organizationId: string, roomId: string): Promise<ChatMessage[]>;
  sendChatMessage(organizationId: string, roomId: string, authorId: string, body: string): Promise<ChatMessage>;
  getNotifications(organizationId: string): Promise<AppNotification[]>;
  markNotificationRead(organizationId: string, id: string): Promise<void>;
  markAllNotificationsRead(organizationId: string): Promise<void>;
}

export interface BusinessService {
  getQuotations(organizationId: string): Promise<Quotation[]>;
  getInvoices(organizationId: string): Promise<Invoice[]>;
  getPayments(organizationId: string): Promise<Payment[]>;
  getExpenses(organizationId: string): Promise<Expense[]>;
  recordPayment(organizationId: string, input: Partial<Payment>): Promise<Payment>;
}

export interface FileService {
  getFiles(organizationId: string): Promise<FileRecord[]>;
  uploadFile(organizationId: string, input: Partial<FileRecord>): Promise<FileRecord>;
  deleteFile(organizationId: string, id: string): Promise<void>;
}

export interface MarketingService {
  getCampaigns(organizationId: string): Promise<Campaign[]>;
  getContentItems(organizationId: string): Promise<ContentItem[]>;
  updateContentItem(organizationId: string, id: string, input: Partial<ContentItem>): Promise<ContentItem>;
  getScheduledContent(organizationId: string): Promise<ScheduledContent[]>;
  retrySchedule(organizationId: string, id: string): Promise<ScheduledContent>;
  getMetaLeads(organizationId: string): Promise<MetaLead[]>;
  getConversations(organizationId: string): Promise<Conversation[]>;
  getConversationMessages(organizationId: string, conversationId: string): Promise<ConversationMessage[]>;
}

export interface AutomationService {
  getWorkflows(organizationId: string): Promise<AutomationWorkflow[]>;
  getWorkflow(organizationId: string, id: string): Promise<AutomationWorkflow | undefined>;
  toggleWorkflow(organizationId: string, id: string, enabled: boolean): Promise<AutomationWorkflow>;
  getExecutionLogs(organizationId: string, workflowId?: string): Promise<ExecutionLog[]>;
}

export interface SystemService {
  getAuditLogs(organizationId: string): Promise<AuditLog[]>;
  getActivities(organizationId: string, entityId?: string): Promise<ActivityEvent[]>;
}

export interface AppServices {
  projects: ProjectService;
  tasks: TaskService;
  crm: CRMService;
  people: PeopleService;
  communication: CommunicationService;
  business: BusinessService;
  files: FileService;
  marketing: MarketingService;
  automation: AutomationService;
  system: SystemService;
}
