import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCreateOrganization, useMyOrganizations, useSession } from "@/hooks/use-cloud";

const STORAGE_KEY = "live-active-org-id";
let isAutoProvisioningGlobally = false;

/** Shared selected organization across every live (Supabase-backed) page. */
export function useActiveOrg() {
  const { user } = useSession();
  const { data: rawOrgs = [], isLoading } = useMyOrganizations();
  const [orgId, setOrgIdState] = useState<string | undefined>();
  const createOrg = useCreateOrganization();
  const createOrgRef = useRef(createOrg);
  createOrgRef.current = createOrg;

  // Deduplicate organizations by name/owner to prevent duplicate entries from cluttering UI
  const orgs = useMemo(() => {
    const seen = new Set<string>();
    return rawOrgs.filter((o) => {
      const key = `${o.owner_id}-${(o.name || "").trim().toLowerCase()}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rawOrgs]);

  // Auto-provision initial workspace once for new users who don't have one yet
  useEffect(() => {
    if (isLoading || !user || rawOrgs.length > 0 || isAutoProvisioningGlobally) return;

    const sessionKey = `teamlio_org_provisioned_${user.id}`;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(sessionKey)) return;

    isAutoProvisioningGlobally = true;
    if (typeof window !== "undefined") window.sessionStorage.setItem(sessionKey, "1");

    const baseName =
      (user.user_metadata?.full_name as string) ||
      (user.email ? user.email.split("@")[0] : "My");
    const name = `${baseName}'s Workspace`;

    createOrgRef.current.mutate(name, {
      onError: () => {
        isAutoProvisioningGlobally = false;
        if (typeof window !== "undefined") window.sessionStorage.removeItem(sessionKey);
      },
      onSettled: () => {
        isAutoProvisioningGlobally = false;
      },
    });
  }, [isLoading, user, rawOrgs.length]);

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
