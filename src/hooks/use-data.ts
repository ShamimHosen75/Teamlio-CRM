import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "@/services";
import { useOrgId, useWorkspace } from "@/app/workspace";
import type { DailyWorkUpdate, FileRecord, Lead, LeaveRequest, Payment, Project, Task } from "@/lib/types";

/** Feature hooks — the only layer components talk to. */

export function useProjects() {
  const org = useOrgId();
  return useQuery({ queryKey: ["projects", org], queryFn: () => services.projects.getProjects(org) });
}

export function useProject(id: string) {
  const org = useOrgId();
  return useQuery({ queryKey: ["project", org, id], queryFn: () => services.projects.getProject(org, id) });
}

export function useMilestones(projectId?: string) {
  const org = useOrgId();
  return useQuery({
    queryKey: ["milestones", org, projectId ?? "all"],
    queryFn: () => services.projects.getMilestones(org, projectId),
  });
}

export function useProjectTemplates() {
  const org = useOrgId();
  return useQuery({ queryKey: ["templates", org], queryFn: () => services.projects.getTemplates(org) });
}

export function useTasks(projectId?: string) {
  const org = useOrgId();
  return useQuery({
    queryKey: ["tasks", org, projectId ?? "all"],
    queryFn: () => services.tasks.getTasks(org, projectId),
  });
}

export function useUpdateTask() {
  const org = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Task> }) =>
      services.tasks.updateTask(org, id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useCreateTask() {
  const org = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Task>) => services.tasks.createTask(org, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useCreateProject() {
  const org = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Project>) => services.projects.createProject(org, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useLeads() {
  const org = useOrgId();
  return useQuery({ queryKey: ["leads", org], queryFn: () => services.crm.getLeads(org) });
}

export function useLead(id: string) {
  const org = useOrgId();
  return useQuery({ queryKey: ["lead", org, id], queryFn: () => services.crm.getLead(org, id) });
}

export function useClients() {
  const org = useOrgId();
  return useQuery({ queryKey: ["clients", org], queryFn: () => services.crm.getClients(org) });
}

export function useClient(id: string) {
  const org = useOrgId();
  return useQuery({ queryKey: ["client", org, id], queryFn: () => services.crm.getClient(org, id) });
}

export function useContacts(clientId?: string) {
  const org = useOrgId();
  return useQuery({
    queryKey: ["contacts", org, clientId ?? "all"],
    queryFn: () => services.crm.getContacts(org, clientId),
  });
}

export function useDeals() {
  const org = useOrgId();
  return useQuery({ queryKey: ["deals", org], queryFn: () => services.crm.getDeals(org) });
}

export function useUpdateDeal() {
  const org = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      services.crm.updateDeal(org, id, { stage: stage as never }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
}

export function useUsers() {
  const org = useOrgId();
  return useQuery({ queryKey: ["users", org], queryFn: () => services.people.getUsers(org) });
}

export function useRoles() {
  const org = useOrgId();
  return useQuery({ queryKey: ["roles", org], queryFn: () => services.people.getRoles(org) });
}

export function useTeams() {
  const org = useOrgId();
  return useQuery({ queryKey: ["teams", org], queryFn: () => services.people.getTeams(org) });
}

export function useTeamMembers(teamId?: string) {
  const org = useOrgId();
  return useQuery({
    queryKey: ["team-members", org, teamId ?? "all"],
    queryFn: () => services.people.getTeamMembers(org, teamId),
  });
}

export function useDailyUpdates(date?: string) {
  const org = useOrgId();
  return useQuery({
    queryKey: ["daily-updates", org, date ?? "all"],
    queryFn: () => services.people.getDailyUpdates(org, date),
  });
}

export function useLeaveRequests() {
  const org = useOrgId();
  return useQuery({ queryKey: ["leave", org], queryFn: () => services.people.getLeaveRequests(org) });
}

export function useLeaveBalance(userId: string) {
  const org = useOrgId();
  return useQuery({
    queryKey: ["leave-balance", org, userId],
    queryFn: () => services.people.getLeaveBalance(org, userId),
  });
}

export function useMeetings() {
  const org = useOrgId();
  return useQuery({ queryKey: ["meetings", org], queryFn: () => services.communication.getMeetings(org) });
}

export function useChatRooms() {
  const org = useOrgId();
  return useQuery({ queryKey: ["chat-rooms", org], queryFn: () => services.communication.getChatRooms(org) });
}

export function useChatMessages(roomId: string) {
  const org = useOrgId();
  return useQuery({
    queryKey: ["chat-messages", org, roomId],
    queryFn: () => services.communication.getChatMessages(org, roomId),
    enabled: Boolean(roomId),
  });
}

export function useNotifications() {
  const org = useOrgId();
  return useQuery({
    queryKey: ["notifications", org],
    queryFn: () => services.communication.getNotifications(org),
  });
}

export function useQuotations() {
  const org = useOrgId();
  return useQuery({ queryKey: ["quotations", org], queryFn: () => services.business.getQuotations(org) });
}

export function useInvoices() {
  const org = useOrgId();
  return useQuery({ queryKey: ["invoices", org], queryFn: () => services.business.getInvoices(org) });
}

export function usePayments() {
  const org = useOrgId();
  return useQuery({ queryKey: ["payments", org], queryFn: () => services.business.getPayments(org) });
}

export function useExpenses() {
  const org = useOrgId();
  return useQuery({ queryKey: ["expenses", org], queryFn: () => services.business.getExpenses(org) });
}

export function useFiles() {
  const org = useOrgId();
  return useQuery({ queryKey: ["files", org], queryFn: () => services.files.getFiles(org) });
}

export function useUploadFile() {
  const org = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<FileRecord>) => services.files.uploadFile(org, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });
}

export function useDeleteFile() {
  const org = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => services.files.deleteFile(org, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });
}

export function useCampaigns() {
  const org = useOrgId();
  return useQuery({ queryKey: ["campaigns", org], queryFn: () => services.marketing.getCampaigns(org) });
}

export function useContentItems() {
  const org = useOrgId();
  return useQuery({ queryKey: ["content", org], queryFn: () => services.marketing.getContentItems(org) });
}

export function useScheduledContent() {
  const org = useOrgId();
  return useQuery({ queryKey: ["scheduled", org], queryFn: () => services.marketing.getScheduledContent(org) });
}

export function useMetaLeads() {
  const org = useOrgId();
  return useQuery({ queryKey: ["meta-leads", org], queryFn: () => services.marketing.getMetaLeads(org) });
}

export function useConversations() {
  const org = useOrgId();
  return useQuery({ queryKey: ["conversations", org], queryFn: () => services.marketing.getConversations(org) });
}

export function useConversationMessages(conversationId: string) {
  const org = useOrgId();
  return useQuery({
    queryKey: ["conversation-messages", org, conversationId],
    queryFn: () => services.marketing.getConversationMessages(org, conversationId),
    enabled: Boolean(conversationId),
  });
}

export function useWorkflows() {
  const org = useOrgId();
  return useQuery({ queryKey: ["workflows", org], queryFn: () => services.automation.getWorkflows(org) });
}

export function useWorkflow(id: string) {
  const org = useOrgId();
  return useQuery({ queryKey: ["workflow", org, id], queryFn: () => services.automation.getWorkflow(org, id) });
}

export function useExecutionLogs(workflowId?: string) {
  const org = useOrgId();
  return useQuery({
    queryKey: ["execution-logs", org, workflowId ?? "all"],
    queryFn: () => services.automation.getExecutionLogs(org, workflowId),
  });
}

export function useAuditLogs() {
  const org = useOrgId();
  return useQuery({ queryKey: ["audit", org], queryFn: () => services.system.getAuditLogs(org) });
}

export function useActivities(entityId?: string) {
  const org = useOrgId();
  return useQuery({
    queryKey: ["activities", org, entityId ?? "all"],
    queryFn: () => services.system.getActivities(org, entityId),
  });
}

export function useConvertLead() {
  const org = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      options,
    }: {
      id: string;
      options: { createClient: boolean; createProject: boolean; templateId?: string; managerId?: string };
    }) => services.crm.convertLead(org, id, options),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateLead() {
  const org = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Lead> }) => services.crm.updateLead(org, id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useCreateLead() {
  const org = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Lead>) => services.crm.createLead(org, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useSendChatMessage() {
  const org = useOrgId();
  const { currentUser } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, body }: { roomId: string; body: string }) =>
      services.communication.sendChatMessage(org, roomId, currentUser.id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-messages"] }),
  });
}

export function useToggleWorkflow() {
  const org = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      services.automation.toggleWorkflow(org, id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflows"] }),
  });
}

export function useRetrySchedule() {
  const org = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => services.marketing.retrySchedule(org, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled"] }),
  });
}

export function useRecordPayment() {
  const org = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Payment>) => services.business.recordPayment(org, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useCreateLeaveRequest() {
  const org = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<LeaveRequest>) => services.people.createLeaveRequest(org, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave"] }),
  });
}

export function useUpdateLeaveRequest() {
  const org = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<LeaveRequest> }) =>
      services.people.updateLeaveRequest(org, id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave"] }),
  });
}

export function useCreateDailyUpdate() {
  const org = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<DailyWorkUpdate>) => services.people.createDailyUpdate(org, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily-updates"] }),
  });
}
