import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { setDefaultCurrency } from "@/lib/format";

export type OrgRole = Database["public"]["Enums"]["org_role"];
export type CloudOrganization = Database["public"]["Tables"]["organizations"]["Row"];
export type CloudTeam = Database["public"]["Tables"]["teams"]["Row"];
export type CloudProfile = Database["public"]["Tables"]["profiles"]["Row"];
export type CloudMember = Database["public"]["Tables"]["organization_members"]["Row"] & {
  profile: CloudProfile | null;
};
export type CloudInvite = Database["public"]["Tables"]["organization_invites"]["Row"];
export type CloudProject = Database["public"]["Tables"]["projects"]["Row"];
export type CloudTask = Database["public"]["Tables"]["project_tasks"]["Row"];

export const ORG_ROLES: OrgRole[] = ["owner", "admin", "manager", "member"];
export const PROJECT_STATUSES = ["backlog", "planned", "in_progress", "review", "paused", "completed"] as const;
export const TASK_STATUSES = ["backlog", "to_do", "in_progress", "review", "paused", "completed"] as const;
export const WORK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type WorkPriority = (typeof WORK_PRIORITIES)[number];

/** Live Supabase session for the signed-in user. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export function useMyProfile() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["cloud", "profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyOrganizations() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["cloud", "organizations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CloudOrganization[];
    },
  });
}

export function useOrgMembers(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["cloud", "members", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", organizationId ?? "")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const ids = (data ?? []).map((m) => m.user_id);
      let profiles: CloudProfile[] = [];
      if (ids.length) {
        const res = await supabase.from("profiles").select("*").in("id", ids);
        if (res.error) throw res.error;
        profiles = res.data ?? [];
      }
      return (data ?? []).map((m) => ({
        ...m,
        profile: profiles.find((p) => p.id === m.user_id) ?? null,
      })) as CloudMember[];
    },
  });
}

/** The signed-in user's membership row (and therefore role) in one organization. */
export function useMyMembership(organizationId: string | undefined) {
  const { user } = useSession();
  return useQuery({
    queryKey: ["cloud", "membership", organizationId, user?.id],
    enabled: !!organizationId && !!user,
    queryFn: async () => {
      if (!organizationId || !user) return null;
      const { data, error } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;

      // Check if user is the organization owner but missing an organization_members row
      const { data: org } = await supabase
        .from("organizations")
        .select("owner_id")
        .eq("id", organizationId)
        .maybeSingle();

      if (org && org.owner_id === user.id) {
        try {
          const { data: healed } = await supabase
            .from("organization_members")
            .upsert({
              organization_id: organizationId,
              user_id: user.id,
              role: "owner" as OrgRole,
              status: "active",
              job_title: "Workspace Owner",
            }, { onConflict: "organization_id,user_id" })
            .select()
            .maybeSingle();
          return healed ?? null;
        } catch {
          return {
            id: `temp-${user.id}`,
            organization_id: organizationId,
            user_id: user.id,
            role: "owner" as OrgRole,
            status: "active" as const,
            job_title: "Workspace Owner",
            created_at: new Date().toISOString(),
          };
        }
      }

      return null;
    },
  });
}

export function useOrgInvites(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["cloud", "invites", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_invites")
        .select("*")
        .eq("organization_id", organizationId ?? "")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CloudInvite[];
    },
  });
}

export function useOrgTeams(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["cloud", "teams", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*, team_members(id, user_id, role_in_team)")
        .eq("organization_id", organizationId ?? "")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as (CloudTeam & {
        team_members: { id: string; user_id: string; role_in_team: string }[];
      })[];
    },
  });
}

export function useOrgProjects(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["cloud", "projects", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CloudProject[];
    },
  });
}

export function useOrgTasks(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["cloud", "tasks", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CloudTask[];
    },
  });
}

export function useCreateProject(organizationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description: string;
      category: string;
      status: ProjectStatus;
      priority: WorkPriority;
      manager_id: string | null;
      due_date: string | null;
    }) => {
      if (!organizationId) throw new Error("Select an organization first");
      const { data, error } = await supabase
        .from("projects")
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as CloudProject;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status?: ProjectStatus; progress?: number; manager_id?: string | null }) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from("projects").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

export function useCreateTask(organizationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      title: string;
      description: string;
      category: string;
      status: TaskStatus;
      priority: WorkPriority;
      assignee_id: string | null;
      due_date: string | null;
    }) => {
      if (!organizationId) throw new Error("Select an organization first");
      const { data, error } = await supabase
        .from("project_tasks")
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as CloudTask;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status?: TaskStatus; assignee_id?: string | null }) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from("project_tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

function slugify(name: string) {
  return `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Sign in before creating an organization");
      const { data, error } = await supabase
        .from("organizations")
        .insert({ name, slug: slugify(name), owner_id: user.id })
        .select()
        .single();
      if (error) throw error;

      // Add creator to organization_members as owner
      try {
        await supabase.from("organization_members").upsert({
          organization_id: data.id,
          user_id: user.id,
          role: "owner" as OrgRole,
          status: "active",
          job_title: "Workspace Owner",
        }, { onConflict: "organization_id,user_id" });
      } catch {
        // Continue even if member insert has edge cases
      }

      return data as CloudOrganization;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

export function useInviteMember(organizationId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: async (input: { email: string; role: OrgRole; job_title?: string }) => {
      if (!organizationId) throw new Error("Select an organization first");
      const { error } = await supabase.from("organization_invites").insert({
        organization_id: organizationId,
        email: input.email.trim().toLowerCase(),
        role: input.role,
        job_title: input.job_title || null,
        invited_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

export function useCancelInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("organization_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; role?: OrgRole; status?: Database["public"]["Enums"]["member_status"] }) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from("organization_members").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("organization_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

export function useCreateTeam(organizationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description: string; lead_id: string | null }) => {
      if (!organizationId) throw new Error("Select an organization first");
      const { error } = await supabase.from("teams").insert({
        organization_id: organizationId,
        name: input.name,
        description: input.description,
        lead_id: input.lead_id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

export function useSetTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { teamId: string; userId: string; add: boolean }) => {
      if (input.add) {
        const { error } = await supabase
          .from("team_members")
          .insert({ team_id: input.teamId, user_id: input.userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("team_members")
          .delete()
          .eq("team_id", input.teamId)
          .eq("user_id", input.userId);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

/* ---------------------------------- Documents --------------------------------- */

export type CloudDocument = Database["public"]["Tables"]["project_documents"]["Row"];
export type CloudDocumentVersion = Database["public"]["Tables"]["project_document_versions"]["Row"];
export const DOCUMENT_BUCKET = "project-documents";

export function useOrgDocuments(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["cloud", "documents", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("project_documents")
        .select("*")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as CloudDocument[];
    },
  });
}

export function useOrgDocumentVersions(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["cloud", "document-versions", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("project_document_versions")
        .select("*")
        .eq("organization_id", organizationId)
        .order("version", { ascending: false });
      if (error) throw error;
      return data as CloudDocumentVersion[];
    },
  });
}

async function uploadVersion(input: {
  organizationId: string;
  projectId: string;
  documentId: string;
  version: number;
  file: File;
  notes: string;
  userId: string | null;
}) {
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${input.organizationId}/${input.projectId}/${input.documentId}/v${input.version}-${safeName}`;
  const up = await supabase.storage.from(DOCUMENT_BUCKET).upload(path, input.file, {
    contentType: input.file.type || "application/octet-stream",
    upsert: true,
  });
  if (up.error) throw up.error;

  const { error } = await supabase.from("project_document_versions").insert({
    organization_id: input.organizationId,
    document_id: input.documentId,
    version: input.version,
    file_name: input.file.name,
    mime_type: input.file.type || "application/octet-stream",
    size_bytes: input.file.size,
    storage_path: path,
    notes: input.notes,
    uploaded_by: input.userId,
  });
  if (error) throw error;

  const bump = await supabase
    .from("project_documents")
    .update({ current_version: input.version })
    .eq("id", input.documentId);
  if (bump.error) throw bump.error;
}

/** Create a document container and upload its first version. */
export function useCreateDocument(organizationId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      name: string;
      description: string;
      category: string;
      file: File;
      notes: string;
    }) => {
      if (!organizationId) throw new Error("Select an organization first");
      const { data, error } = await supabase
        .from("project_documents")
        .insert({
          organization_id: organizationId,
          project_id: input.project_id,
          name: input.name,
          description: input.description,
          category: input.category,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      await uploadVersion({
        organizationId,
        projectId: input.project_id,
        documentId: data.id,
        version: 1,
        file: input.file,
        notes: input.notes,
        userId: user?.id ?? null,
      });
      return data as CloudDocument;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

/** Upload a new version of an existing document. */
export function useUploadDocumentVersion(organizationId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: async (input: { document: CloudDocument; file: File; notes: string }) => {
      if (!organizationId) throw new Error("Select an organization first");
      await uploadVersion({
        organizationId,
        projectId: input.document.project_id,
        documentId: input.document.id,
        version: input.document.current_version + 1,
        file: input.file,
        notes: input.notes,
        userId: user?.id ?? null,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; paths: string[] }) => {
      if (input.paths.length) await supabase.storage.from(DOCUMENT_BUCKET).remove(input.paths);
      const { error } = await supabase.from("project_documents").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

/** Short-lived signed URL used for preview and download. */
export async function getDocumentUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export type CloudOrgSettings = Database["public"]["Tables"]["organization_settings"]["Row"];

export const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "BDT", "INR", "AUD", "CAD", "AED", "SGD"] as const;
export const TIMEZONE_OPTIONS = [
  "UTC",
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
] as const;

/** Workspace defaults (currency, timezone, admin email) for one organization. */
export function useOrgSettings(organizationId: string | undefined) {
  const query = useQuery({
    queryKey: ["cloud", "org-settings", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", organizationId!)
        .maybeSingle();
      if (error) throw error;
      return (data as CloudOrgSettings | null) ?? null;
    },
  });

  useEffect(() => {
    if (query.data?.currency) setDefaultCurrency(query.data.currency);
  }, [query.data?.currency]);

  return query;
}

export function useSaveOrgSettings(organizationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { currency: string; timezone: string; admin_email: string }) => {
      if (!organizationId) throw new Error("Select an organization first");
      const { error } = await supabase
        .from("organization_settings")
        .upsert({ organization_id: organizationId, ...input }, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

export const AVATAR_BUCKET = "avatars";

/** Update the signed-in user's own profile row. */
export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { full_name?: string; job_title?: string | null; avatar_url?: string | null }) => {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user?.id;
      if (!id) throw new Error("You are not signed in");
      const { error } = await supabase.from("profiles").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

/** Upload a new avatar image and store a long-lived link on the profile. */
export function useUploadMyAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user?.id;
      if (!id) throw new Error("You are not signed in");
      const ext = (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${id}/avatar-${Date.now()}.${ext || "png"}`;
      const up = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, { upsert: true });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed.error) throw signed.error;
      const { error } = await supabase.from("profiles").update({ avatar_url: signed.data.signedUrl }).eq("id", id);
      if (error) throw error;
      return signed.data.signedUrl;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}

/** Change the sign-in email address; Supabase may require confirmation. */
export function useUpdateMyEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      const id = data.user?.id;
      if (id && data.user?.email) {
        await supabase.from("profiles").update({ email: data.user.email }).eq("id", id);
      }
      return data.user?.email ?? email;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud"] }),
  });
}
