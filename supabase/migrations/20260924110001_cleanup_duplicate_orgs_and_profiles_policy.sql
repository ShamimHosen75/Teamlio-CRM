-- Migration: cleanup_duplicate_orgs_and_profiles_policy
-- 1. Allow all authenticated users to read profiles of created accounts
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- 2. Clean up duplicate organizations created by runaway auto-provisioning
-- Keeps the oldest organization for each owner/name pair and cascades deletion to duplicate memberships
DELETE FROM public.organizations o1
WHERE o1.id NOT IN (
  SELECT DISTINCT ON (owner_id, lower(trim(name))) id
  FROM public.organizations
  ORDER BY owner_id, lower(trim(name)), created_at ASC
);
