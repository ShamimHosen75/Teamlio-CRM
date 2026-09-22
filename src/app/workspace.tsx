import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ORG_ROLE_TO_ROLE_NAME, ROLE_PERMISSIONS, type Permission } from "@/lib/permissions";
import { organizations, roles, users } from "@/lib/mock/seed";
import { CURRENT_USER_ID, DEFAULT_ORG_ID } from "@/services/store";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useSession, useMyProfile, useMyMembership } from "@/hooks/use-cloud";
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
  const [demoRoleName, setRoleName] = useState(defaultRole);

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

  const roleName = liveRoleName ?? requestedRoleName ?? demoRoleName;

  const permissions = useMemo(() => ROLE_PERMISSIONS[roleName] ?? [], [roleName]);
  const can = useCallback((permission: Permission) => permissions.includes(permission), [permissions]);

  const value = useMemo<WorkspaceValue>(
    () => ({
      organization: organizations.find((o) => o.id === organizationId) ?? organizations[0],
      organizations,
      setOrganizationId,
      currentUser,
      updateCurrentUser,
      roleName,
      setRoleName,
      roleIsLive: !!liveRoleName,
      permissions,
      can,
    }),
    [organizationId, currentUser, updateCurrentUser, roleName, liveRoleName, permissions, can],
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

export function useOrgId() {
  const { activeOrgId } = useActiveOrg();
  const ws = useWorkspace();
  // Prefer the live Supabase org (from useActiveOrg) when available;
  // fall back to the demo workspace org for unauthenticated / mock mode.
  return activeOrgId ?? ws.organization.id;
}
