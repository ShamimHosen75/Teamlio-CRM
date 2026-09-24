/**
 * Supabase service provider — live implementation of AppServices.
 *
 * Every method mirrors the contract in interfaces.ts and returns the same
 * shape as the mock provider, except queries go to the Supabase database.
 *
 * To switch the entire app to live data, update services/index.ts:
 *   export const services: AppServices = supabaseServices;
 */

import type { AppServices } from "./interfaces";
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
  TeamMemberRequest,
  TeamMemberRequestStatus,
  User,
} from "@/lib/types";
import { supabase as typedSupabase } from "@/integrations/supabase/client";

// Cast client to any because migrations add tables that are not yet in the generated Database type definitions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = typedSupabase as any;

/* ─── helpers ─────────────────────────────────────────────────────────── */

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Map a Supabase row (snake_case DB columns) to the app-level type where
 * field names may differ. If the row already matches the interface, the
 * spread is a no-op.
 */

/* ─── projects ────────────────────────────────────────────────────────── */

const projectService: AppServices["projects"] = {
  async getProjects(org) {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toProject);
  },

  async getProject(org, id) {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("organization_id", org)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toProject(data) : undefined;
  },

  async createProject(org, input) {
    const row = {
      organization_id: org,
      name: input.name ?? "Untitled project",
      description: input.description ?? "",
      category: "General",
      status: mapProjectStatusToDB(input.status ?? "Planned"),
      priority: (input.priority ?? "Medium").toLowerCase(),
      manager_id: input.manager_user_id || null,
      start_date: input.start_date || null,
      due_date: input.due_date || null,
      progress: input.progress ?? 0,
    };
    const { data, error } = await supabase
      .from("projects")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return toProject(data);
  },

  async updateProject(org, id, input) {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.status !== undefined) patch.status = mapProjectStatusToDB(input.status);
    if (input.priority !== undefined) patch.priority = input.priority.toLowerCase();
    if (input.progress !== undefined) patch.progress = input.progress;
    if (input.manager_user_id !== undefined) patch.manager_id = input.manager_user_id || null;
    if (input.due_date !== undefined) patch.due_date = input.due_date || null;
    if (input.start_date !== undefined) patch.start_date = input.start_date || null;

    const { data, error } = await supabase
      .from("projects")
      .update(patch)
      .eq("id", id)
      .eq("organization_id", org)
      .select()
      .single();
    if (error) throw error;
    return toProject(data);
  },

  async archiveProject(org, id) {
    return this.updateProject(org, id, { status: "Archived" as never });
  },

  async getMilestones(org, projectId) {
    let q = supabase
      .from("milestones")
      .select("*")
      .eq("organization_id", org)
      .order("due_date", { ascending: true });
    if (projectId) q = q.eq("project_id", projectId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(toMilestone);
  },

  async getTemplates(org) {
    const { data, error } = await supabase
      .from("project_templates")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toProjectTemplate);
  },
};

/* ─── tasks ───────────────────────────────────────────────────────────── */

const taskService: AppServices["tasks"] = {
  async getTasks(org, projectId) {
    let q = supabase
      .from("project_tasks")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (projectId) q = q.eq("project_id", projectId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(toTask);
  },

  async getTask(org, id) {
    const { data, error } = await supabase
      .from("project_tasks")
      .select("*")
      .eq("organization_id", org)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toTask(data) : undefined;
  },

  async createTask(org, input) {
    const row = {
      organization_id: org,
      project_id: input.project_id,
      title: input.title ?? "Untitled task",
      description: input.description ?? "",
      category: "General",
      status: mapTaskStatusToDB(input.status ?? "To Do"),
      priority: (input.priority ?? "Medium").toLowerCase(),
      assignee_id: input.assignee_ids?.[0] || null,
      due_date: input.due_date || null,
    };
    const { data, error } = await supabase
      .from("project_tasks")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return toTask(data);
  },

  async updateTask(org, id, input) {
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.status !== undefined) patch.status = mapTaskStatusToDB(input.status);
    if (input.priority !== undefined) patch.priority = input.priority.toLowerCase();
    if (input.assignee_ids !== undefined) patch.assignee_id = input.assignee_ids[0] || null;
    if (input.due_date !== undefined) patch.due_date = input.due_date || null;

    const { data, error } = await supabase
      .from("project_tasks")
      .update(patch)
      .eq("id", id)
      .eq("organization_id", org)
      .select()
      .single();
    if (error) throw error;
    return toTask(data);
  },

  async assignTask(org, id, userIds) {
    return this.updateTask(org, id, { assignee_ids: userIds } as never);
  },

  async getComments(org, entityId) {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("organization_id", org)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toComment);
  },
};

/* ─── CRM ─────────────────────────────────────────────────────────────── */

const crmService: AppServices["crm"] = {
  async getLeads(org) {
    const { data, error } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toLead);
  },

  async getLead(org, id) {
    const { data, error } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("organization_id", org)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toLead(data) : undefined;
  },

  async createLead(org, input) {
    const row = {
      organization_id: org,
      name: input.name ?? "",
      company: input.company ?? "",
      email: input.email ?? "",
      phone: input.phone ?? "",
      source: input.source ?? "Manual",
      status: (input.status ?? "New").toLowerCase(),
      estimated_value: input.estimated_value ?? 0,
      notes: input.notes ?? "",
      assigned_to: input.assigned_user_id || null,
    };
    const { data, error } = await supabase
      .from("crm_leads")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return toLead(data);
  },

  async updateLead(org, id, input) {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.company !== undefined) patch.company = input.company;
    if (input.email !== undefined) patch.email = input.email;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.status !== undefined) patch.status = input.status.toLowerCase();
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.assigned_user_id !== undefined) patch.assigned_to = input.assigned_user_id || null;
    if (input.converted_client_id !== undefined) patch.converted_client_id = input.converted_client_id || null;

    const { data, error } = await supabase
      .from("crm_leads")
      .update(patch)
      .eq("id", id)
      .eq("organization_id", org)
      .select()
      .single();
    if (error) throw error;
    return toLead(data);
  },

  async convertLead(org, id, options) {
    const lead = await this.getLead(org, id);
    if (!lead) throw new Error("Lead not found");

    let client: Client | undefined;
    let project: Project | undefined;

    if (options.createClient) {
      client = await this.createClient(org, {
        company: lead.company || lead.name,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        status: "Active",
        industry: "General",
      } as never);

      await this.updateLead(org, id, { status: "Won", converted_client_id: client.id } as never);
    }

    if (options.createProject && client) {
      project = await projectService.createProject(org, {
        name: `${client.company || client.name} project`,
        manager_user_id: options.managerId,
        start_date: options.startDate,
        due_date: options.dueDate,
        template_id: options.templateId ?? null,
        client_id: client.id,
      } as never);
    }

    return { client, project };
  },

  async createClient(org, input: Partial<Client>) {
    const row = {
      organization_id: org,
      company: (input as any).company ?? input.name ?? "",
      contact_name: input.name ?? "",
      email: input.email ?? "",
      phone: input.phone ?? "",
      website: input.website ?? "",
      industry: input.industry ?? "General",
      status: (input.status ?? "active").toLowerCase(),
      notes: "",
      owner_id: input.owner_user_id || null,
    };
    const { data, error } = await supabase
      .from("crm_clients")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return toClient(data);
  },

  async getClients(org) {
    const { data, error } = await supabase
      .from("crm_clients")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toClient);
  },

  async getClient(org, id) {
    const { data, error } = await supabase
      .from("crm_clients")
      .select("*")
      .eq("organization_id", org)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toClient(data) : undefined;
  },

  async getContacts(org, clientId) {
    let q = supabase
      .from("contacts")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: true });
    if (clientId) q = q.eq("client_id", clientId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(toContact);
  },

  async getDeals(org) {
    const { data, error } = await supabase
      .from("crm_deals")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toDeal);
  },

  async createDeal(org, input: Partial<Deal>) {
    const row = {
      organization_id: org,
      title: input.title ?? "Untitled deal",
      client_id: input.client_id || null,
      lead_id: input.lead_id || null,
      value: input.value ?? 0,
      probability: input.probability ?? 50,
      stage: mapDealStageToDB(input.stage ?? "Discovery"),
      expected_close_date: input.expected_close_date || null,
      notes: input.notes ?? "",
      owner_id: input.owner_user_id || null,
    };
    const { data, error } = await supabase
      .from("crm_deals")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return toDeal(data);
  },

  async updateDeal(org, id, input) {
    const patch: Record<string, unknown> = {};
    if (input.stage !== undefined) patch.stage = mapDealStageToDB(input.stage);
    if (input.value !== undefined) patch.value = input.value;
    if (input.probability !== undefined) patch.probability = input.probability;
    if (input.owner_user_id !== undefined) patch.owner_id = input.owner_user_id || null;
    if (input.expected_close_date !== undefined) patch.expected_close_date = input.expected_close_date || null;
    if (input.notes !== undefined) patch.notes = input.notes;

    const { data, error } = await supabase
      .from("crm_deals")
      .update(patch)
      .eq("id", id)
      .eq("organization_id", org)
      .select()
      .single();
    if (error) throw error;
    return toDeal(data);
  },
};

/* ─── people ──────────────────────────────────────────────────────────── */

const peopleService: AppServices["people"] = {
  async getUsers(org) {
    // Get org members with their profiles
    const { data: members, error: mErr } = await supabase
      .from("organization_members")
      .select("*")
      .eq("organization_id", org);
    if (mErr) throw mErr;

    // Also get the organization owner so they always show up in user/manager dropdowns
    const { data: orgRow } = await supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", org)
      .maybeSingle();

    const ids = Array.from(new Set([
      ...(members ?? []).map((m: Row) => m.user_id),
      ...(orgRow?.owner_id ? [orgRow.owner_id] : []),
    ]));

    if (!ids.length) return [];

    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .in("id", ids);
    if (pErr) throw pErr;

    return (profiles ?? []).map((p: Row) => {
      const member = members?.find((m: Row) => m.user_id === p.id);
      return toUser(p, member ?? { role: "owner", job_title: "Owner" });
    });
  },

  async getRoles(org) {
    // Roles are currently managed in-memory via permissions.ts
    // Return a minimal set derived from the org_role enum
    const { ROLE_PERMISSIONS } = await import("@/lib/permissions");
    return Object.entries(ROLE_PERMISSIONS).map(([name, perms], i) => ({
      id: `role_${i + 1}`,
      organization_id: org,
      name,
      description: `${name} default role`,
      is_system: true,
      permissions: perms as string[],
      created_at: nowIso(),
      updated_at: nowIso(),
    }));
  },

  async getTeams(org) {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toTeam);
  },

  async createTeam(org, input) {
    const { data, error } = await (supabase as any)
      .from("teams")
      .insert({
        organization_id: org,
        name: input.name,
        description: input.description ?? "",
        lead_id: input.lead_user_id || null,
      })
      .select()
      .single();
    if (error) throw error;

    if (input.initialMemberIds?.length) {
      const memberRows = input.initialMemberIds.map((userId) => ({
        team_id: data.id,
        user_id: userId,
        role_in_team: "Member",
      }));
      await (supabase as any).from("team_members").insert(memberRows);
    }

    return toTeam(data);
  },

  async getTeamMembers(org, teamId) {
    const users = await this.getUsers(org);
    let q = supabase.from("team_members").select("*");
    if (teamId) {
      q = q.eq("team_id", teamId);
    } else {
      // Get all team members for teams in this org
      const { data: teams } = await supabase
        .from("teams")
        .select("id")
        .eq("organization_id", org);
      const teamIds = (teams ?? []).map((t: Row) => t.id);
      if (!teamIds.length) return [];
      q = q.in("team_id", teamIds);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((tm: Row) => ({
      user: users.find((u) => u.id === tm.user_id) ?? users[0],
      role_in_team: tm.role_in_team,
    }));
  },

  async getDailyUpdates(org, date) {
    let q = supabase
      .from("daily_work_updates")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (date) q = q.eq("update_date", date);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(toDailyUpdate);
  },

  async createDailyUpdate(org, input) {
    const row = {
      organization_id: org,
      user_id: input.user_id!,
      update_date: input.date ?? nowIso().slice(0, 10),
      completed_today: input.completed_today ?? "",
      working_on: input.working_on ?? "",
      next_plan: input.next_plan ?? "",
      blockers: input.blockers ?? "",
      project_id: input.project_id ?? null,
      task_ids: input.task_ids ?? [],
      status: input.status ?? "Submitted",
      submitted_at: nowIso(),
    };
    const { data, error } = await supabase
      .from("daily_work_updates")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return toDailyUpdate(data);
  },

  async getLeaveRequests(org) {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toLeaveRequest);
  },

  async createLeaveRequest(org, input) {
    const row = {
      organization_id: org,
      user_id: input.user_id!,
      leave_type: input.leave_type ?? "Annual",
      start_date: input.start_date!,
      end_date: input.end_date!,
      duration_days: input.duration_days ?? 1,
      half_day: input.half_day ?? false,
      reason: input.reason ?? "",
      approver_id: input.approver_id ?? null,
      status: input.status ?? "Pending",
    };
    const { data, error } = await supabase
      .from("leave_requests")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return toLeaveRequest(data);
  },

  async updateLeaveRequest(org, id, input) {
    const patch: Record<string, unknown> = {};
    if (input.status !== undefined) patch.status = input.status;
    if (input.reason !== undefined) patch.reason = input.reason;

    const { data, error } = await supabase
      .from("leave_requests")
      .update(patch)
      .eq("id", id)
      .eq("organization_id", org)
      .select()
      .single();
    if (error) throw error;
    return toLeaveRequest(data);
  },

  async getLeaveBalance(org, userId) {
    const { data, error } = await supabase
      .from("leave_balances")
      .select("*")
      .eq("organization_id", org)
      .eq("user_id", userId);
    if (error) throw error;
    if (!data?.length) {
      // Return defaults when no balances exist yet
      return [
        { leave_type: "Annual", entitled: 15, used: 0, pending: 0 },
        { leave_type: "Sick", entitled: 10, used: 0, pending: 0 },
        { leave_type: "Personal", entitled: 5, used: 0, pending: 0 },
      ];
    }
    return data.map((r: Row) => ({
      leave_type: r.leave_type,
      entitled: Number(r.entitled),
      used: Number(r.used),
      pending: Number(r.pending),
    }));
  },

  async getTeamMemberRequests(org, teamId) {
    let q = supabase
      .from("team_member_requests")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (teamId) q = q.eq("team_id", teamId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(toTeamMemberRequest);
  },

  async createTeamMemberRequest(org, input) {
    const row = {
      organization_id: org,
      team_id: input.team_id,
      user_id: input.user_id,
      role_in_team: input.role_in_team || "Member",
      status: "pending",
      message: input.message || "",
    };
    const { data, error } = await supabase
      .from("team_member_requests")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return toTeamMemberRequest(data);
  },

  async reviewTeamMemberRequest(org, id, status, reviewerId) {
    const { data, error } = await supabase
      .from("team_member_requests")
      .update({
        status,
        reviewed_by: reviewerId,
        reviewed_at: nowIso(),
      })
      .eq("id", id)
      .eq("organization_id", org)
      .select()
      .single();
    if (error) throw error;

    if (status === "approved" && data) {
      await supabase
        .from("team_members")
        .insert({
          team_id: data.team_id,
          user_id: data.user_id,
          role_in_team: data.role_in_team,
        });
    }

    return toTeamMemberRequest(data);
  },
};

/* ─── communication ───────────────────────────────────────────────────── */

const communicationService: AppServices["communication"] = {
  async getMeetings(org) {
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .eq("organization_id", org)
      .order("meeting_date", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toMeeting);
  },

  async createMeeting(org, input) {
    const row = {
      organization_id: org,
      title: input.title ?? "Untitled meeting",
      type: input.type ?? "Internal",
      participant_ids: input.participant_ids ?? [],
      client_id: input.client_id || null,
      project_id: input.project_id || null,
      meeting_date: input.date || new Date().toISOString().slice(0, 10),
      start_time: input.start_time ?? "09:00",
      end_time: input.end_time ?? "10:00",
      meeting_url: input.meeting_url ?? "",
      location: input.location ?? "",
      agenda: input.agenda ?? "",
      notes: input.notes ?? "",
      status: input.status ?? "Scheduled",
    };
    const { data, error } = await supabase
      .from("meetings")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return toMeeting(data);
  },

  async getChatRooms(org) {
    const { data, error } = await supabase
      .from("chat_rooms")
      .select("*")
      .eq("organization_id", org)
      .order("last_message_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toChatRoom);
  },

  async getChatMessages(org, roomId) {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("organization_id", org)
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toChatMessage);
  },

  async sendChatMessage(org, roomId, authorId, body) {
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        organization_id: org,
        room_id: roomId,
        author_id: authorId,
        body,
      })
      .select()
      .single();
    if (error) throw error;

    // Update last_message_at on the room
    await supabase
      .from("chat_rooms")
      .update({ last_message_at: nowIso() })
      .eq("id", roomId);

    return toChatMessage(data);
  },

  async getNotifications(org) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toNotification);
  },

  async markNotificationRead(org, id) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("organization_id", org);
  },

  async markAllNotificationsRead(org) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("organization_id", org)
      .eq("read", false);
  },
};

/* ─── business ────────────────────────────────────────────────────────── */

const businessService: AppServices["business"] = {
  async getQuotations(org) {
    const { data, error } = await supabase
      .from("quotations")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toQuotation);
  },

  async getInvoices(org) {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toInvoice);
  },

  async getPayments(org) {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toPayment);
  },

  async getExpenses(org) {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toExpense);
  },

  async recordPayment(org, input) {
    const row = {
      organization_id: org,
      invoice_id: input.invoice_id ?? null,
      client_id: input.client_id ?? null,
      amount: input.amount ?? 0,
      method: mapPaymentMethodToDB(input.method ?? "Bank Transfer"),
      reference: input.reference ?? "",
      paid_on: input.payment_date ?? nowIso().slice(0, 10),
      notes: input.notes ?? "",
    };
    const { data, error } = await supabase
      .from("payments")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return toPayment(data);
  },
};

/* ─── files ───────────────────────────────────────────────────────────── */

const fileService: AppServices["files"] = {
  async getFiles(org) {
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toFileRecord);
  },

  async uploadFile(org, input) {
    const row = {
      organization_id: org,
      name: input.name ?? "Untitled",
      folder: input.folder ?? "",
      mime_type: input.mime_type ?? "application/octet-stream",
      size_kb: input.size_kb ?? 0,
      uploader_id: input.uploader_id ?? null,
      project_id: input.project_id ?? null,
      client_id: input.client_id ?? null,
      task_id: input.task_id ?? null,
      shared: input.shared ?? false,
    };
    const { data, error } = await supabase
      .from("files")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return toFileRecord(data);
  },

  async deleteFile(org, id) {
    const { error } = await supabase
      .from("files")
      .delete()
      .eq("id", id)
      .eq("organization_id", org);
    if (error) throw error;
  },
};

/* ─── marketing ───────────────────────────────────────────────────────── */

const marketingService: AppServices["marketing"] = {
  async getCampaigns(org) {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toCampaign);
  },

  async getContentItems(org) {
    const { data, error } = await supabase
      .from("content_items")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toContentItem);
  },

  async updateContentItem(org, id, input) {
    const patch: Record<string, unknown> = {};
    if (input.status !== undefined) patch.status = input.status;
    if (input.title !== undefined) patch.title = input.title;

    const { data, error } = await supabase
      .from("content_items")
      .update(patch)
      .eq("id", id)
      .eq("organization_id", org)
      .select()
      .single();
    if (error) throw error;
    return toContentItem(data);
  },

  async getScheduledContent(org) {
    const { data, error } = await supabase
      .from("scheduled_content")
      .select("*")
      .eq("organization_id", org)
      .order("scheduled_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toScheduledContent);
  },

  async retrySchedule(org, id) {
    const { data, error } = await supabase
      .from("scheduled_content")
      .update({ status: "Retrying", attempts: 0 })
      .eq("id", id)
      .eq("organization_id", org)
      .select()
      .single();
    if (error) throw error;
    return toScheduledContent(data);
  },

  async getMetaLeads(org) {
    const { data, error } = await supabase
      .from("meta_leads")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toMetaLead);
  },

  async getConversations(org) {
    const { data, error } = await supabase
      .from("marketing_conversations")
      .select("*")
      .eq("organization_id", org)
      .order("last_message_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toConversation);
  },

  async getConversationMessages(org, conversationId) {
    const { data, error } = await supabase
      .from("marketing_conversation_messages")
      .select("*")
      .eq("organization_id", org)
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toConversationMessage);
  },
};

/* ─── automation ──────────────────────────────────────────────────────── */

const automationService: AppServices["automation"] = {
  async getWorkflows(org) {
    const { data, error } = await supabase
      .from("automation_workflows")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toWorkflow);
  },

  async getWorkflow(org, id) {
    const { data, error } = await supabase
      .from("automation_workflows")
      .select("*")
      .eq("organization_id", org)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toWorkflow(data) : undefined;
  },

  async toggleWorkflow(org, id, enabled) {
    const { data, error } = await supabase
      .from("automation_workflows")
      .update({ enabled })
      .eq("id", id)
      .eq("organization_id", org)
      .select()
      .single();
    if (error) throw error;
    return toWorkflow(data);
  },

  async getExecutionLogs(org, workflowId) {
    let q = supabase
      .from("execution_logs")
      .select("*")
      .eq("organization_id", org)
      .order("ran_at", { ascending: false });
    if (workflowId) q = q.eq("workflow_id", workflowId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(toExecutionLog);
  },
};

/* ─── system ──────────────────────────────────────────────────────────── */

const systemService: AppServices["system"] = {
  async getAuditLogs(org) {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toAuditLog);
  },

  async getActivities(org, entityId) {
    let q = supabase
      .from("activities")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false });
    if (entityId) q = q.eq("entity_id", entityId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(toActivity);
  },
};

/* ═══════════════════════ ROW → TYPE MAPPERS ════════════════════════════ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function capitalize(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* -- status mappings: DB uses snake_case, app uses Title Case -- */

const PROJECT_STATUS_MAP: Record<string, string> = {
  backlog: "Draft",
  planned: "Planned",
  in_progress: "In Progress",
  review: "Under Review",
  paused: "On Hold",
  completed: "Completed",
};

function mapProjectStatusFromDB(dbStatus: string): string {
  return PROJECT_STATUS_MAP[dbStatus] ?? capitalize(dbStatus);
}

function mapProjectStatusToDB(appStatus: string): string {
  const reverse: Record<string, string> = {};
  for (const [k, v] of Object.entries(PROJECT_STATUS_MAP)) reverse[v] = k;
  reverse["Archived"] = "completed";
  reverse["Cancelled"] = "completed";
  reverse["Overdue"] = "in_progress";
  return reverse[appStatus] ?? appStatus.toLowerCase().replace(/ /g, "_");
}

const TASK_STATUS_MAP: Record<string, string> = {
  backlog: "Backlog",
  to_do: "To Do",
  in_progress: "In Progress",
  review: "Review",
  paused: "Blocked",
  completed: "Completed",
};

function mapTaskStatusFromDB(dbStatus: string): string {
  return TASK_STATUS_MAP[dbStatus] ?? capitalize(dbStatus);
}

function mapTaskStatusToDB(appStatus: string): string {
  const reverse: Record<string, string> = {};
  for (const [k, v] of Object.entries(TASK_STATUS_MAP)) reverse[v] = k;
  return reverse[appStatus] ?? appStatus.toLowerCase().replace(/ /g, "_");
}

const DEAL_STAGE_MAP: Record<string, string> = {
  new_opportunity: "New Opportunity",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

function mapDealStageFromDB(dbStage: string): string {
  return DEAL_STAGE_MAP[dbStage] ?? capitalize(dbStage);
}

function mapDealStageToDB(appStage: string): string {
  const reverse: Record<string, string> = {};
  for (const [k, v] of Object.entries(DEAL_STAGE_MAP)) reverse[v] = k;
  return reverse[appStage] ?? appStage.toLowerCase().replace(/ /g, "_");
}

function mapPaymentMethodToDB(m: string): string {
  const map: Record<string, string> = {
    "Bank Transfer": "bank_transfer",
    Card: "card",
    Cash: "cash",
    "Mobile Banking": "online",
    Cheque: "cheque",
  };
  return map[m] ?? "other";
}

function mapPaymentMethodFromDB(m: string): string {
  const map: Record<string, string> = {
    bank_transfer: "Bank Transfer",
    card: "Card",
    cash: "Cash",
    cheque: "Cheque",
    online: "Mobile Banking",
    other: "Bank Transfer",
  };
  return map[m] ?? capitalize(m);
}

/* ─── row mappers ─────────────────────────────────────────────────────── */

function toProject(r: Row): Project {
  return {
    id: r.id,
    organization_id: r.organization_id,
    code: `PRJ-${r.id.slice(0, 4).toUpperCase()}`,
    name: r.name,
    description: r.description ?? "",
    client_id: "",
    manager_user_id: r.manager_id ?? "",
    team_ids: [],
    start_date: r.start_date ?? "",
    due_date: r.due_date ?? "",
    status: mapProjectStatusFromDB(r.status) as Project["status"],
    priority: capitalize(r.priority) as Project["priority"],
    progress: r.progress ?? 0,
    budget: 0,
    spent: 0,
    health: "On Track",
    template_id: null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toTask(r: Row): Task {
  return {
    id: r.id,
    organization_id: r.organization_id,
    code: `TSK-${r.id.slice(0, 4).toUpperCase()}`,
    title: r.title,
    description: r.description ?? "",
    project_id: r.project_id,
    assignee_ids: r.assignee_id ? [r.assignee_id] : [],
    team_id: null,
    reporter_id: "",
    follower_ids: [],
    priority: capitalize(r.priority) as Task["priority"],
    status: mapTaskStatusFromDB(r.status) as Task["status"],
    start_date: r.created_at?.slice(0, 10) ?? "",
    due_date: r.due_date ?? "",
    progress: 0,
    checklist: [],
    parent_task_id: null,
    dependency_ids: [],
    labels: r.category ? [r.category] : [],
    attachment_ids: [],
    milestone_id: null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toComment(r: Row): Comment {
  return {
    id: r.id,
    organization_id: r.organization_id,
    entity_type: r.entity_type ?? "",
    entity_id: r.entity_id ?? "",
    author_id: r.author_id ?? "",
    body: r.body ?? "",
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toLead(r: Row): Lead {
  return {
    id: r.id,
    organization_id: r.organization_id,
    code: `LD-${r.id.slice(0, 4).toUpperCase()}`,
    name: r.name,
    email: r.email ?? "",
    phone: r.phone ?? "",
    company: r.company ?? "",
    source: r.source as Lead["source"],
    assigned_user_id: r.assigned_to ?? "",
    status: capitalize(r.status) as Lead["status"],
    estimated_value: Number(r.estimated_value ?? 0),
    last_activity_at: r.updated_at,
    tags: [],
    notes: r.notes ?? "",
    converted_client_id: r.converted_client_id ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toClient(r: Row): Client {
  return {
    id: r.id,
    organization_id: r.organization_id,
    name: r.contact_name || r.company,
    company: r.company,
    email: r.email ?? "",
    phone: r.phone ?? "",
    website: r.website ?? "",
    address: "",
    owner_user_id: r.owner_id ?? "",
    status: capitalize(r.status) as Client["status"],
    industry: r.industry ?? "General",
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toContact(r: Row): Contact {
  return {
    id: r.id,
    organization_id: r.organization_id,
    client_id: r.client_id,
    full_name: r.full_name ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    designation: r.designation ?? "",
    is_primary: r.is_primary ?? false,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toDeal(r: Row): Deal {
  return {
    id: r.id,
    organization_id: r.organization_id,
    title: r.title,
    lead_id: r.lead_id ?? null,
    client_id: r.client_id ?? null,
    value: Number(r.value ?? 0),
    probability: r.probability ?? 50,
    pipeline: "Default",
    stage: mapDealStageFromDB(r.stage) as Deal["stage"],
    expected_close_date: r.expected_close_date ?? "",
    owner_user_id: r.owner_id ?? "",
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toUser(profile: Row, member?: Row): User {
  return {
    id: profile.id,
    organization_id: member?.organization_id ?? "",
    full_name: profile.full_name ?? "",
    email: profile.email ?? "",
    phone: "",
    avatar_url: profile.avatar_url ?? null,
    job_title: member?.job_title ?? profile.job_title ?? "",
    role_id: `role_${member?.role === "owner" || member?.role === "admin" ? "1" : member?.role === "manager" ? "2" : "3"}`,
    status: member?.status === "active" ? "Active" : member?.status === "invited" ? "Invited" : "Inactive",
    last_login_at: null,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

function toTeam(r: Row): Team {
  return {
    id: r.id,
    organization_id: r.organization_id,
    name: r.name,
    description: r.description ?? "",
    lead_user_id: r.lead_id ?? "",
    status: "Active",
    color: "#6366f1",
    created_at: r.created_at,
    updated_at: r.created_at,
  };
}

function toMilestone(r: Row): Milestone {
  return {
    id: r.id,
    organization_id: r.organization_id,
    project_id: r.project_id,
    name: r.name,
    description: r.description ?? "",
    due_date: r.due_date ?? "",
    team_id: r.team_id ?? null,
    progress: r.progress ?? 0,
    status: r.status as Milestone["status"],
    deliverables: r.deliverables ?? [],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toProjectTemplate(r: Row): ProjectTemplate {
  return {
    id: r.id,
    organization_id: r.organization_id,
    name: r.name,
    category: r.category ?? "General",
    description: r.description ?? "",
    default_duration_days: r.default_duration_days ?? 30,
    task_titles: r.task_titles ?? [],
    milestone_titles: r.milestone_titles ?? [],
    workflow_stages: r.workflow_stages ?? [],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toMeeting(r: Row): Meeting {
  return {
    id: r.id,
    organization_id: r.organization_id,
    title: r.title,
    type: r.type as Meeting["type"],
    participant_ids: r.participant_ids ?? [],
    client_id: r.client_id ?? null,
    project_id: r.project_id ?? null,
    date: r.meeting_date ?? "",
    start_time: r.start_time ?? "09:00",
    end_time: r.end_time ?? "10:00",
    meeting_url: r.meeting_url ?? "",
    location: r.location ?? "",
    agenda: r.agenda ?? "",
    notes: r.notes ?? "",
    status: r.status as Meeting["status"],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toChatRoom(r: Row): ChatRoom {
  return {
    id: r.id,
    organization_id: r.organization_id,
    name: r.name,
    type: r.type as ChatRoom["type"],
    member_ids: r.member_ids ?? [],
    project_id: r.project_id ?? null,
    last_message_at: r.last_message_at ?? r.created_at,
    unread_count: 0,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toChatMessage(r: Row): ChatMessage {
  return {
    id: r.id,
    organization_id: r.organization_id,
    room_id: r.room_id,
    author_id: r.author_id,
    body: r.body ?? "",
    reply_to_id: r.reply_to_id ?? null,
    reactions: r.reactions ?? [],
    pinned: r.pinned ?? false,
    read_by: r.read_by ?? [],
    attachment_name: r.attachment_name ?? undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toNotification(r: Row): AppNotification {
  return {
    id: r.id,
    organization_id: r.organization_id,
    type: r.type as AppNotification["type"],
    title: r.title ?? "",
    body: r.body ?? "",
    read: r.read ?? false,
    link: r.link ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toQuotation(r: Row): Quotation {
  return {
    id: r.id,
    organization_id: r.organization_id,
    number: r.quote_number ?? "",
    client_id: r.client_id ?? "",
    project_id: r.project_id ?? null,
    items: r.items ?? [],
    discount: Number(r.discount ?? 0),
    tax_rate: Number(r.tax_rate ?? 0),
    terms: r.terms ?? "",
    expiry_date: r.expiry_date ?? "",
    status: r.status as Quotation["status"],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toInvoice(r: Row): Invoice {
  return {
    id: r.id,
    organization_id: r.organization_id,
    number: r.invoice_number ?? "",
    client_id: r.client_id ?? "",
    project_id: r.project_id ?? null,
    quotation_id: null,
    items: [],
    discount: 0,
    tax_rate: Number(r.tax_rate ?? 0),
    paid_amount: 0,
    issue_date: r.issue_date ?? "",
    due_date: r.due_date ?? "",
    status: capitalize(r.status) as Invoice["status"],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toPayment(r: Row): Payment {
  return {
    id: r.id,
    organization_id: r.organization_id,
    invoice_id: r.invoice_id ?? "",
    client_id: r.client_id ?? "",
    amount: Number(r.amount ?? 0),
    method: mapPaymentMethodFromDB(r.method) as Payment["method"],
    reference: r.reference ?? "",
    payment_date: r.paid_on ?? "",
    status: "Completed",
    notes: r.notes ?? "",
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toExpense(r: Row): Expense {
  return {
    id: r.id,
    organization_id: r.organization_id,
    project_id: r.project_id ?? null,
    category: r.category ?? "General",
    vendor: r.vendor ?? "",
    amount: Number(r.amount ?? 0),
    date: r.spent_on ?? "",
    status: capitalize(r.status) as Expense["status"],
    notes: r.notes ?? "",
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toFileRecord(r: Row): FileRecord {
  return {
    id: r.id,
    organization_id: r.organization_id,
    name: r.name,
    folder: r.folder ?? "",
    mime_type: r.mime_type ?? "application/octet-stream",
    size_kb: r.size_kb ?? 0,
    uploader_id: r.uploader_id ?? "",
    project_id: r.project_id ?? null,
    client_id: r.client_id ?? null,
    task_id: r.task_id ?? null,
    shared: r.shared ?? false,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toCampaign(r: Row): Campaign {
  return {
    id: r.id,
    organization_id: r.organization_id,
    name: r.name,
    client_id: r.client_id ?? null,
    objective: r.objective ?? "",
    status: r.status as Campaign["status"],
    spend: Number(r.spend ?? 0),
    reach: r.reach ?? 0,
    impressions: r.impressions ?? 0,
    clicks: r.clicks ?? 0,
    leads: r.leads ?? 0,
    conversions: r.conversions ?? 0,
    revenue: Number(r.revenue ?? 0),
    start_date: r.start_date ?? "",
    end_date: r.end_date ?? "",
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toContentItem(r: Row): ContentItem {
  return {
    id: r.id,
    organization_id: r.organization_id,
    title: r.title,
    caption: r.caption ?? "",
    content_type: r.content_type as ContentItem["content_type"],
    platform: r.platform as ContentItem["platform"],
    campaign_id: r.campaign_id ?? null,
    client_id: r.client_id ?? null,
    hashtags: r.hashtags ?? [],
    cta: r.cta ?? "",
    destination_url: r.destination_url ?? "",
    writer_id: r.writer_id ?? null,
    designer_id: r.designer_id ?? null,
    reviewer_id: r.reviewer_id ?? null,
    approver_id: r.approver_id ?? null,
    publish_date: r.publish_date ?? "",
    publish_time: r.publish_time ?? "09:00",
    timezone: r.timezone ?? "UTC",
    status: r.status as ContentItem["status"],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toScheduledContent(r: Row): ScheduledContent {
  return {
    id: r.id,
    organization_id: r.organization_id,
    content_id: r.content_id ?? "",
    platform: r.platform ?? "",
    account: r.account ?? "",
    scheduled_at: r.scheduled_at ?? "",
    status: r.status as ScheduledContent["status"],
    attempts: r.attempts ?? 0,
    result: r.result ?? "",
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toMetaLead(r: Row): MetaLead {
  return {
    id: r.id,
    organization_id: r.organization_id,
    full_name: r.full_name ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    campaign_id: r.campaign_id ?? "",
    ad_name: r.ad_name ?? "",
    ad_set_name: r.ad_set_name ?? "",
    lead_form: r.lead_form ?? "",
    assigned_user_id: r.assigned_user_id ?? null,
    crm_status: r.crm_status as MetaLead["crm_status"],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toConversation(r: Row): Conversation {
  return {
    id: r.id,
    organization_id: r.organization_id,
    channel: r.channel as Conversation["channel"],
    contact_name: r.contact_name ?? "",
    contact_phone: r.contact_phone ?? "",
    last_message: r.last_message ?? "",
    last_message_at: r.last_message_at ?? r.created_at,
    unread: r.unread ?? 0,
    assigned_user_id: r.assigned_user_id ?? null,
    lead_id: r.lead_id ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toConversationMessage(r: Row): ConversationMessage {
  return {
    id: r.id,
    organization_id: r.organization_id,
    conversation_id: r.conversation_id,
    direction: r.direction as "in" | "out",
    body: r.body ?? "",
    sent_at: r.sent_at ?? r.created_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toWorkflow(r: Row): AutomationWorkflow {
  return {
    id: r.id,
    organization_id: r.organization_id,
    name: r.name,
    description: r.description ?? "",
    trigger: r.trigger_event ?? "",
    conditions: r.conditions ?? [],
    actions: r.actions ?? [],
    enabled: r.enabled ?? false,
    runs: r.runs ?? 0,
    last_run_at: r.last_run_at ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toExecutionLog(r: Row): ExecutionLog {
  return {
    id: r.id,
    organization_id: r.organization_id,
    workflow_id: r.workflow_id,
    status: r.status as ExecutionLog["status"],
    message: r.message ?? "",
    duration_ms: r.duration_ms ?? 0,
    ran_at: r.ran_at ?? r.created_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toAuditLog(r: Row): AuditLog {
  return {
    id: r.id,
    organization_id: r.organization_id,
    user_id: r.user_id ?? "",
    action: r.action ?? "",
    entity_type: r.entity_type ?? "",
    entity_label: r.entity_label ?? "",
    old_value: r.old_value ?? "",
    new_value: r.new_value ?? "",
    ip: r.ip ?? "",
    status: r.status as AuditLog["status"],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toActivity(r: Row): ActivityEvent {
  return {
    id: r.id,
    organization_id: r.organization_id,
    entity_type: r.entity_type ?? "",
    entity_id: r.entity_id ?? "",
    actor_id: r.actor_id ?? "",
    action: r.action ?? "",
    detail: r.detail ?? "",
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toDailyUpdate(r: Row): DailyWorkUpdate {
  return {
    id: r.id,
    organization_id: r.organization_id,
    user_id: r.user_id,
    date: r.update_date ?? "",
    completed_today: r.completed_today ?? "",
    working_on: r.working_on ?? "",
    next_plan: r.next_plan ?? "",
    blockers: r.blockers ?? "",
    project_id: r.project_id ?? null,
    task_ids: r.task_ids ?? [],
    status: r.status as DailyWorkUpdate["status"],
    submitted_at: r.submitted_at ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toLeaveRequest(r: Row): LeaveRequest {
  return {
    id: r.id,
    organization_id: r.organization_id,
    user_id: r.user_id,
    leave_type: r.leave_type ?? "Annual",
    start_date: r.start_date ?? "",
    end_date: r.end_date ?? "",
    duration_days: Number(r.duration_days ?? 1),
    half_day: r.half_day ?? false,
    reason: r.reason ?? "",
    approver_id: r.approver_id ?? "",
    status: r.status as LeaveRequest["status"],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toTeamMemberRequest(r: Row): TeamMemberRequest {
  return {
    id: r.id,
    organization_id: r.organization_id,
    team_id: r.team_id,
    user_id: r.user_id,
    role_in_team: r.role_in_team ?? "Member",
    status: (r.status ?? "pending") as TeamMemberRequestStatus,
    message: r.message ?? "",
    reviewed_by: r.reviewed_by ?? null,
    reviewed_at: r.reviewed_at ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/* ═══════════════════════ EXPORT ═════════════════════════════════════════ */

export const supabaseServices: AppServices = {
  projects: projectService,
  tasks: taskService,
  crm: crmService,
  people: peopleService,
  communication: communicationService,
  business: businessService,
  files: fileService,
  marketing: marketingService,
  automation: automationService,
  system: systemService,
};
