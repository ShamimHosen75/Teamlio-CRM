import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ORG_ROLE_TO_ROLE_NAME, ROLE_PERMISSIONS, type Permission } from "@/lib/permissions";
import { organizations, roles, users } from "@/lib/mock/seed";
import { CURRENT_USER_ID, DEFAULT_ORG_ID } from "@/services/store";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useSession, useMyProfile, useMyMembership, type CloudOrganization } from "@/hooks/use-cloud";
import type { Organization, User } from "@/lib/types";

interface WorkspaceValue {
  organization: Organization;
  organizations: Organization[];
  setOrganizationId: (id: string) => void;
  currentUser: User;
  updateCurrentUser: (patch: Partial<User>) => void;
  roleName: string;
  setRoleName: (name: string) => void;
  /** True when the role comes from a live workspace membership instead of the demo switcher. */
  roleIsLive: boolean;
  permissions: Permission[];
  can: (permission: Permission) => boolean;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [organizationId, setOrganizationId] = useState(DEFAULT_ORG_ID);
  const baseUser = users.find((u) => u.id === CURRENT_USER_ID)!;

  const { user } = useSession();
  const { data: profile } = useMyProfile();

  const [profileOverride, setProfileOverride] = useState<Partial<User>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem("teamlio_user_profile");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const updateCurrentUser = useCallback((patch: Partial<User>) => {
    setProfileOverride((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem("teamlio_user_profile", JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const currentUser = useMemo<User>(() => {
    const email =
      profileOverride.email ||
      profile?.email ||
      user?.email ||
      baseUser.email;

    const full_name =
      profileOverride.full_name ||
      profile?.full_name ||
      (user?.user_metadata?.full_name as string | undefined) ||
      (user?.email ? user.email.split("@")[0] : undefined) ||
      baseUser.full_name;

    const job_title =
      profileOverride.job_title ||
      profile?.job_title ||
      (user ? "Workspace Member" : baseUser.job_title);

    const avatar_url =
      profileOverride.avatar_url !== undefined
        ? profileOverride.avatar_url
        : profile?.avatar_url || baseUser.avatar_url;

    const id = user?.id || baseUser.id;

    return {
      ...baseUser,
      id,
      email,
      full_name,
      job_title,
      avatar_url,
    };
  }, [baseUser, user, profile, profileOverride]);

  const defaultRole = roles.find((r) => r.id === baseUser.role_id)?.name ?? "Organization Owner";
  const [demoRoleName, setDemoRoleName] = useState(defaultRole);

  const { activeOrgId } = useActiveOrg();
  const { data: membership } = useMyMembership(activeOrgId);
  const liveRoleName = membership ? ORG_ROLE_TO_ROLE_NAME[membership.role] : undefined;

  const requestedRole = (user?.user_metadata?.requested_role as string | undefined)?.toLowerCase();
  const requestedRoleName =
    requestedRole === "admin"
      ? "Admin"
      : requestedRole === "manager"
      ? "Project Manager"
      : requestedRole === "member"
      ? "Team Member"
      : undefined;

  // Logged-in users' role is strictly their live membership or signup role, not manually switchable.
  const roleName = user ? (liveRoleName ?? requestedRoleName ?? "Team Member") : demoRoleName;

  const setRoleName = useCallback((role: string) => {
    // Only permit switching in unauthenticated demo mode
    if (!user) {
      setDemoRoleName(role);
    }
  }, [user]);

  const permissions = useMemo(() => ROLE_PERMISSIONS[roleName] ?? [], [roleName]);
  const can = useCallback((permission: Permission) => permissions.includes(permission), [permissions]);

  const { activeOrg, orgs: liveOrgs } = useActiveOrg();

  // Build organization list: prefer live Supabase orgs when authenticated, deduplicated
  const liveOrganizations: Organization[] = useMemo(() => {
    const seen = new Set<string>();
    return liveOrgs
      .filter((o: CloudOrganization) => {
        const key = (o.name || "").trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((o: CloudOrganization) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        currency: "USD",
        timezone: "UTC",
        logo_url: (o as any).logo_url ?? null,
        owner_user_id: o.owner_id ?? "",
        plan: "Professional" as const,
        billing_email: "",
        max_members: 100,
        created_at: o.created_at ?? "",
        updated_at: o.updated_at ?? "",
      }));
  }, [liveOrgs]);

  const resolvedOrganization = useMemo<Organization>(() => {
    if (activeOrg) {
      return {
        id: activeOrg.id,
        name: activeOrg.name,
        slug: activeOrg.slug,
        currency: "USD",
        timezone: "UTC",
        logo_url: (activeOrg as any).logo_url ?? null,
        owner_user_id: activeOrg.owner_id ?? "",
        plan: "Professional" as const,
        billing_email: "",
        max_members: 100,
        created_at: activeOrg.created_at ?? "",
        updated_at: activeOrg.updated_at ?? "",
      };
    }
    return organizations.find((o) => o.id === organizationId) ?? organizations[0];
  }, [activeOrg, organizationId]);

  const resolvedOrganizations = liveOrganizations.length > 0 ? liveOrganizations : organizations;

  const value = useMemo<WorkspaceValue>(
    () => ({
      organization: resolvedOrganization,
      organizations: resolvedOrganizations,
      setOrganizationId,
      currentUser,
      updateCurrentUser,
      roleName,
      setRoleName,
      roleIsLive: !!liveRoleName,
      permissions,
      can,
    }),
    [resolvedOrganization, resolvedOrganizations, currentUser, updateCurrentUser, roleName, liveRoleName, permissions, can],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}

export function usePermissions() {
  const { can, permissions, roleName, roleIsLive } = useWorkspace();
  return { can, permissions, roleName, roleIsLive };
}

export function useOrgId(): string {
  const { activeOrgId } = useActiveOrg();
  const { user } = useSession();
  const ws = useWorkspace();

  // When the user is signed in, ONLY use the real Supabase org ID.
  // Never fall back to the mock "org_001" — that would cause every
  // write to be silently rejected by RLS.
  if (user) {
    return activeOrgId ?? "";
  }

  // Unauthenticated demo mode — use the mock org for the landing page.
  return activeOrgId ?? ws.organization.id;
}
