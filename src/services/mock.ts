import type { AppServices } from "./interfaces";
import type {
  Client,
  DailyWorkUpdate,
  Lead,
  LeaveRequest,
  Payment,
  Project,
  Task,
} from "@/lib/types";
import { CURRENT_USER_ID, LEAVE_TYPES, delay, nowIso, scope, store, uid } from "./store";

const meta = (organizationId: string) => ({
  organization_id: organizationId,
  created_at: nowIso(),
  updated_at: nowIso(),
});

export const mockServices: AppServices = {
  projects: {
    async getProjects(org) {
      return delay(scope(store.projects, org));
    },
    async getProject(org, id) {
      return delay(scope(store.projects, org).find((p) => p.id === id));
    },
    async createProject(org, input) {
      const project: Project = {
        id: uid("prj"),
        ...meta(org),
        code: `PRJ-${100 + store.projects.length + 1}`,
        name: input.name ?? "Untitled project",
        description: input.description ?? "",
        client_id: input.client_id ?? store.clients[0].id,
        manager_user_id: input.manager_user_id ?? CURRENT_USER_ID,
        team_ids: input.team_ids ?? [],
        start_date: input.start_date ?? nowIso().slice(0, 10),
        due_date: input.due_date ?? nowIso().slice(0, 10),
        status: input.status ?? "Planned",
        priority: input.priority ?? "Medium",
        progress: 0,
        budget: input.budget ?? 0,
        spent: 0,
        health: "On Track",
        template_id: input.template_id ?? null,
      };
      store.projects = [project, ...store.projects];
      return delay(project);
    },
    async updateProject(org, id, input) {
      store.projects = store.projects.map((p) =>
        p.id === id ? { ...p, ...input, updated_at: nowIso() } : p,
      );
      return delay(store.projects.find((p) => p.id === id)!);
    },
    async archiveProject(org, id) {
      return this.updateProject(org, id, { status: "Archived" });
    },
    async getMilestones(org, projectId) {
      const rows = scope(store.milestones, org);
      return delay(projectId ? rows.filter((m) => m.project_id === projectId) : rows);
    },
    async getTemplates(org) {
      return delay(scope(store.projectTemplates, org));
    },
  },

  tasks: {
    async getTasks(org, projectId) {
      const rows = scope(store.tasks, org);
      return delay(projectId ? rows.filter((t) => t.project_id === projectId) : rows);
    },
    async getTask(org, id) {
      return delay(scope(store.tasks, org).find((t) => t.id === id));
    },
    async createTask(org, input) {
      const task: Task = {
        id: uid("task"),
        ...meta(org),
        code: `TSK-${2000 + store.tasks.length + 1}`,
        title: input.title ?? "Untitled task",
        description: input.description ?? "",
        project_id: input.project_id ?? store.projects[0].id,
        assignee_ids: input.assignee_ids ?? [],
        team_id: input.team_id ?? null,
        reporter_id: input.reporter_id ?? CURRENT_USER_ID,
        follower_ids: [],
        priority: input.priority ?? "Medium",
        status: input.status ?? "To Do",
        start_date: input.start_date ?? nowIso().slice(0, 10),
        due_date: input.due_date ?? nowIso().slice(0, 10),
        progress: 0,
        checklist: [],
        parent_task_id: null,
        dependency_ids: [],
        labels: input.labels ?? [],
        attachment_ids: [],
        milestone_id: input.milestone_id ?? null,
      };
      store.tasks = [task, ...store.tasks];
      return delay(task);
    },
    async updateTask(org, id, input) {
      store.tasks = store.tasks.map((t) => (t.id === id ? { ...t, ...input, updated_at: nowIso() } : t));
      return delay(store.tasks.find((t) => t.id === id)!);
    },
    async assignTask(org, id, userIds) {
      return this.updateTask(org, id, { assignee_ids: userIds });
    },
    async getComments(org, entityId) {
      return delay(scope(store.comments, org).filter((c) => c.entity_id === entityId));
    },
  },

  crm: {
    async getLeads(org) {
      return delay(scope(store.leads, org));
    },
    async getLead(org, id) {
      return delay(scope(store.leads, org).find((l) => l.id === id));
    },
    async createLead(org, input) {
      const lead: Lead = {
        id: uid("lead"),
        ...meta(org),
        code: `LD-${1000 + store.leads.length + 1}`,
        name: input.name ?? "New lead",
        email: input.email ?? "",
        phone: input.phone ?? "",
        company: input.company ?? "",
        source: input.source ?? "Manual",
        assigned_user_id: input.assigned_user_id ?? CURRENT_USER_ID,
        status: input.status ?? "New",
        estimated_value: input.estimated_value ?? 0,
        last_activity_at: nowIso(),
        tags: input.tags ?? [],
        notes: input.notes ?? "",
        converted_client_id: null,
      };
      store.leads = [lead, ...store.leads];
      return delay(lead);
    },
    async updateLead(org, id, input) {
      store.leads = store.leads.map((l) => (l.id === id ? { ...l, ...input, updated_at: nowIso() } : l));
      return delay(store.leads.find((l) => l.id === id)!);
    },
    async convertLead(org, id, options) {
      const lead = store.leads.find((l) => l.id === id);
      if (!lead) throw new Error("Lead not found");
      let client: Client | undefined;
      let project: Project | undefined;

      if (options.createClient) {
        client = {
          id: uid("cli"),
          ...meta(org),
          name: lead.company || lead.name,
          company: lead.company,
          email: lead.email,
          phone: lead.phone,
          website: "",
          address: "",
          owner_user_id: lead.assigned_user_id,
          status: "Active",
          industry: "General",
        };
        store.clients = [client, ...store.clients];
      }

      if (options.createProject) {
        project = await mockServices.projects.createProject(org, {
          name: `${lead.company || lead.name} engagement`,
          client_id: client?.id ?? store.clients[0].id,
          manager_user_id: options.managerId ?? CURRENT_USER_ID,
          template_id: options.templateId ?? null,
          start_date: options.startDate,
          due_date: options.dueDate,
          budget: lead.estimated_value,
          status: "Planned",
        });
      }

      store.leads = store.leads.map((l) =>
        l.id === id ? { ...l, status: "Won", converted_client_id: client?.id ?? l.converted_client_id } : l,
      );
      return delay({ client, project });
    },
    async getClients(org) {
      return delay(scope(store.clients, org));
    },
    async createClient(org, input) {
      const client: Client = {
        id: uid("cli"),
        ...meta(org),
        company: input.company || input.name || "Untitled Client",
        name: input.name || "Client",
        email: input.email || "",
        phone: input.phone || "",
        status: input.status || "Active",
        industry: input.industry || "General",
        tags: [],
        owner_user_id: input.owner_user_id || CURRENT_USER_ID,
      };
      store.clients = [client, ...store.clients];
      return delay(client);
    },
    async getClient(org, id) {
      return delay(scope(store.clients, org).find((c) => c.id === id));
    },
    async getContacts(org, clientId) {
      const rows = scope(store.contacts, org);
      return delay(clientId ? rows.filter((c) => c.client_id === clientId) : rows);
    },
    async getDeals(org) {
      return delay(scope(store.deals, org));
    },
    async createDeal(org, input) {
      const deal: Deal = {
        id: uid("dl"),
        ...meta(org),
        title: input.title || "Untitled Deal",
        client_id: input.client_id || "",
        stage: input.stage || "Discovery",
        value: input.value || 0,
        probability: input.probability || 50,
        expected_close_date: input.expected_close_date || nowIso().slice(0, 10),
        owner_user_id: input.owner_user_id || CURRENT_USER_ID,
        notes: input.notes || "",
        lead_id: input.lead_id || null,
      };
      store.deals = [deal, ...store.deals];
      return delay(deal);
    },
    async updateDeal(org, id, input) {
      store.deals = store.deals.map((d) => (d.id === id ? { ...d, ...input, updated_at: nowIso() } : d));
      return delay(store.deals.find((d) => d.id === id)!, 80);
    },
  },

  people: {
    async getUsers(org) {
      return delay(scope(store.users, org));
    },
    async getRoles(org) {
      return delay(scope(store.roles, org));
    },
    async getTeams(org) {
      return delay(scope(store.teams, org));
    },
    async getTeamMembers(org, teamId) {
      const rows = scope(store.teamMembers, org).filter((m) => (teamId ? m.team_id === teamId : true));
      return delay(
        rows
          .map((m) => ({ user: store.users.find((u) => u.id === m.user_id)!, role_in_team: m.role_in_team }))
          .filter((r) => Boolean(r.user)),
      );
    },
    async getDailyUpdates(org, date) {
      const rows = scope(store.dailyUpdates, org);
      return delay(date ? rows.filter((d) => d.date === date) : rows);
    },
    async createDailyUpdate(org, input) {
      const update: DailyWorkUpdate = {
        id: uid("du"),
        ...meta(org),
        user_id: input.user_id ?? CURRENT_USER_ID,
        date: input.date ?? nowIso().slice(0, 10),
        completed_today: input.completed_today ?? "",
        working_on: input.working_on ?? "",
        next_plan: input.next_plan ?? "",
        blockers: input.blockers ?? "",
        project_id: input.project_id ?? null,
        task_ids: input.task_ids ?? [],
        status: input.status ?? "Submitted",
        submitted_at: nowIso(),
      };
      store.dailyUpdates = [update, ...store.dailyUpdates];
      return delay(update);
    },
    async getLeaveRequests(org) {
      return delay(scope(store.leaveRequests, org));
    },
    async createLeaveRequest(org, input) {
      const leave: LeaveRequest = {
        id: uid("lv"),
        ...meta(org),
        user_id: input.user_id ?? CURRENT_USER_ID,
        leave_type: input.leave_type ?? LEAVE_TYPES[0],
        start_date: input.start_date ?? nowIso().slice(0, 10),
        end_date: input.end_date ?? nowIso().slice(0, 10),
        duration_days: input.duration_days ?? 1,
        half_day: input.half_day ?? false,
        reason: input.reason ?? "",
        approver_id: input.approver_id ?? "usr_003",
        status: "Pending",
      };
      store.leaveRequests = [leave, ...store.leaveRequests];
      return delay(leave);
    },
    async updateLeaveRequest(org, id, input) {
      store.leaveRequests = store.leaveRequests.map((l) =>
        l.id === id ? { ...l, ...input, updated_at: nowIso() } : l,
      );
      return delay(store.leaveRequests.find((l) => l.id === id)!, 80);
    },
    async getLeaveBalance(org, userId) {
      const mine = scope(store.leaveRequests, org).filter((l) => l.user_id === userId);
      return delay(
        LEAVE_TYPES.map((type) => ({
          leave_type: type,
          entitled: type === "Annual Leave" ? 20 : type === "Sick Leave" ? 12 : 8,
          used: mine.filter((l) => l.leave_type === type && l.status === "Approved").reduce((s, l) => s + l.duration_days, 0),
          pending: mine.filter((l) => l.leave_type === type && l.status === "Pending").reduce((s, l) => s + l.duration_days, 0),
        })),
      );
    },
  },

  communication: {
    async getMeetings(org) {
      return delay(scope(store.meetings, org));
    },
    async createMeeting(org, input) {
      const meeting: Meeting = {
        id: uid("mtg"),
        ...meta(org),
        title: input.title || "Untitled Meeting",
        type: input.type || "Internal",
        participant_ids: input.participant_ids || [CURRENT_USER_ID],
        client_id: input.client_id || null,
        project_id: input.project_id || null,
        date: input.date || nowIso().slice(0, 10),
        start_time: input.start_time || "09:00",
        end_time: input.end_time || "10:00",
        meeting_url: input.meeting_url || "",
        location: input.location || "Online",
        agenda: input.agenda || "",
        notes: input.notes || "",
        status: input.status || "Scheduled",
      };
      store.meetings = [meeting, ...store.meetings];
      return delay(meeting);
    },
    async getChatRooms(org) {
      return delay(scope(store.chatRooms, org));
    },
    async getChatMessages(org, roomId) {
      return delay(scope(store.chatMessages, org).filter((m) => m.room_id === roomId), 120);
    },
    async sendChatMessage(org, roomId, authorId, body) {
      const message = {
        id: uid("msg"),
        ...meta(org),
        room_id: roomId,
        author_id: authorId,
        body,
        reply_to_id: null,
        reactions: [],
        pinned: false,
        read_by: [authorId],
      };
      store.chatMessages = [...store.chatMessages, message];
      return delay(message, 80);
    },
    async getNotifications(org) {
      return delay(scope(store.notifications, org));
    },
    async markNotificationRead(org, id) {
      store.notifications = store.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      return delay(undefined, 50);
    },
    async markAllNotificationsRead(org) {
      store.notifications = store.notifications.map((n) =>
        n.organization_id === org ? { ...n, read: true } : n,
      );
      return delay(undefined, 50);
    },
  },

  business: {
    async getQuotations(org) {
      return delay(scope(store.quotations, org));
    },
    async getInvoices(org) {
      return delay(scope(store.invoices, org));
    },
    async getPayments(org) {
      return delay(scope(store.payments, org));
    },
    async getExpenses(org) {
      return delay(scope(store.expenses, org));
    },
    async recordPayment(org, input) {
      const payment: Payment = {
        id: uid("pay"),
        ...meta(org),
        invoice_id: input.invoice_id ?? store.invoices[0].id,
        client_id: input.client_id ?? store.clients[0].id,
        amount: input.amount ?? 0,
        method: input.method ?? "Bank Transfer",
        reference: input.reference ?? "",
        payment_date: input.payment_date ?? nowIso().slice(0, 10),
        status: "Completed",
        notes: input.notes ?? "",
      };
      store.payments = [payment, ...store.payments];
      return delay(payment);
    },
  },

  files: {
    async getFiles(org) {
      return delay(scope(store.files, org));
    },
    async uploadFile(org, input) {
      const file = {
        id: uid("file"),
        ...meta(org),
        name: input.name ?? "untitled.pdf",
        folder: input.folder ?? "Shared Files",
        mime_type: input.mime_type ?? "application/pdf",
        size_kb: input.size_kb ?? 240,
        uploader_id: CURRENT_USER_ID,
        project_id: input.project_id ?? null,
        client_id: input.client_id ?? null,
        task_id: null,
        shared: false,
      };
      store.files = [file, ...store.files];
      return delay(file, 500);
    },
    async deleteFile(org, id) {
      store.files = store.files.filter((f) => f.id !== id);
      return delay(undefined, 80);
    },
  },

  marketing: {
    async getCampaigns(org) {
      return delay(scope(store.campaigns, org));
    },
    async getContentItems(org) {
      return delay(scope(store.contentItems, org));
    },
    async updateContentItem(org, id, input) {
      store.contentItems = store.contentItems.map((c) =>
        c.id === id ? { ...c, ...input, updated_at: nowIso() } : c,
      );
      return delay(store.contentItems.find((c) => c.id === id)!, 80);
    },
    async getScheduledContent(org) {
      return delay(scope(store.scheduledContent, org));
    },
    async retrySchedule(org, id) {
      store.scheduledContent = store.scheduledContent.map((s) =>
        s.id === id ? { ...s, status: "Retrying", attempts: s.attempts + 1 } : s,
      );
      return delay(store.scheduledContent.find((s) => s.id === id)!, 80);
    },
    async getMetaLeads(org) {
      return delay(scope(store.metaLeads, org));
    },
    async getConversations(org) {
      return delay(scope(store.conversations, org));
    },
    async getConversationMessages(org, conversationId) {
      return delay(
        scope(store.conversationMessages, org).filter((m) => m.conversation_id === conversationId),
        120,
      );
    },
  },

  automation: {
    async getWorkflows(org) {
      return delay(scope(store.workflows, org));
    },
    async getWorkflow(org, id) {
      return delay(scope(store.workflows, org).find((w) => w.id === id));
    },
    async toggleWorkflow(org, id, enabled) {
      store.workflows = store.workflows.map((w) => (w.id === id ? { ...w, enabled } : w));
      return delay(store.workflows.find((w) => w.id === id)!, 60);
    },
    async getExecutionLogs(org, workflowId) {
      const rows = scope(store.executionLogs, org);
      return delay(workflowId ? rows.filter((l) => l.workflow_id === workflowId) : rows);
    },
  },

  system: {
    async getAuditLogs(org) {
      return delay(scope(store.auditLogs, org));
    },
    async getActivities(org, entityId) {
      const rows = scope(store.activities, org);
      return delay(entityId ? rows.filter((a) => a.entity_id === entityId) : rows);
    },
  },
};
