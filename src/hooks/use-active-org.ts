import { useCallback, useEffect, useRef, useState } from "react";
import { useCreateOrganization, useMyOrganizations, useSession } from "@/hooks/use-cloud";

const STORAGE_KEY = "live-active-org-id";

/** Shared selected organization across every live (Supabase-backed) page. */
export function useActiveOrg() {
  const { user } = useSession();
  const { data: orgs = [], isLoading } = useMyOrganizations();
  const [orgId, setOrgIdState] = useState<string | undefined>();
  const createOrg = useCreateOrganization();
  const provisioningRef = useRef(false);

  // Auto-provision initial workspace for new users who don't have one yet
  useEffect(() => {
    if (isLoading || !user || orgs.length > 0 || provisioningRef.current) return;
    provisioningRef.current = true;
    const name =
      (user.user_metadata?.full_name as string) ||
      (user.email ? `${user.email.split("@")[0]}'s Workspace` : "My Workspace");
    createOrg.mutate(name, {
      onError: () => {
        provisioningRef.current = false;
      },
    });
  }, [isLoading, user, orgs.length, createOrg]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setOrgIdState(stored);
  }, []);

  useEffect(() => {
    if (!orgs.length) return;
    if (!orgId || !orgs.some((o) => o.id === orgId)) setOrgIdState(orgs[0]?.id);
  }, [orgs, orgId]);

  const setOrgId = useCallback((next: string) => {
    setOrgIdState(next);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const activeOrgId = orgId && orgs.some((o) => o.id === orgId) ? orgId : orgs[0]?.id;

  return {
    orgs,
    isLoading,
    activeOrgId,
    activeOrg: orgs.find((o) => o.id === activeOrgId),
    setOrgId,
  };
}
