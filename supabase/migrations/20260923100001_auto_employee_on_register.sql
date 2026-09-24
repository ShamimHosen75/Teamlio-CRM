-- =============================================================
-- AUTO-ADD EMPLOYEES ON REGISTRATION
-- When a user signs up with a requested_role, persist that
-- designation on their profile and organization membership.
-- =============================================================

-- 1. Update handle_new_user() to store requested_role as job_title on profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _requested_role text;
  _job_title text;
BEGIN
  -- Extract the requested role from user metadata
  _requested_role := COALESCE(NEW.raw_user_meta_data ->> 'requested_role', 'member');

  -- Map role to a human-readable job title / designation
  _job_title := CASE _requested_role
    WHEN 'admin'   THEN 'Administrator'
    WHEN 'manager' THEN 'Project Manager'
    WHEN 'member'  THEN 'Team Member'
    ELSE 'Team Member'
  END;

  -- Create the profile row with job_title from the requested role
  INSERT INTO public.profiles (id, full_name, email, avatar_url, job_title)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data ->> 'avatar_url',
    _job_title
  )
  ON CONFLICT (id) DO UPDATE SET
    job_title = COALESCE(EXCLUDED.job_title, public.profiles.job_title);

  -- Auto-accept any pending invitations for this email
  INSERT INTO public.organization_members (organization_id, user_id, role, status, job_title)
  SELECT i.organization_id, NEW.id, i.role, 'active', COALESCE(i.job_title, _job_title)
  FROM public.organization_invites i
  WHERE lower(i.email) = lower(COALESCE(NEW.email, '')) AND i.accepted_at IS NULL
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  UPDATE public.organization_invites
  SET accepted_at = now()
  WHERE lower(email) = lower(COALESCE(NEW.email, '')) AND accepted_at IS NULL;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 2. Update add_owner_membership() to use the creator's requested_role
--    The creator is always owner_id on the org, but their membership row
--    reflects their chosen designation for display in Employees / User Mgmt.
CREATE OR REPLACE FUNCTION public.add_owner_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _requested_role text;
  _org_role public.org_role;
  _job_title text;
BEGIN
  -- Look up the user's requested role from their auth metadata
  SELECT COALESCE(raw_user_meta_data ->> 'requested_role', 'owner')
  INTO _requested_role
  FROM auth.users
  WHERE id = NEW.owner_id;

  -- Map the string to the org_role enum and a display job title
  -- For workspace creators, if they chose admin/manager/member that's their
  -- visible role, but they still retain full control via owner_id on the org.
  _org_role := CASE _requested_role
    WHEN 'admin'   THEN 'admin'::public.org_role
    WHEN 'manager' THEN 'manager'::public.org_role
    WHEN 'member'  THEN 'member'::public.org_role
    ELSE 'owner'::public.org_role
  END;

  _job_title := CASE _requested_role
    WHEN 'admin'   THEN 'Administrator'
    WHEN 'manager' THEN 'Project Manager'
    WHEN 'member'  THEN 'Team Member'
    ELSE 'Workspace Owner'
  END;

  INSERT INTO public.organization_members (organization_id, user_id, role, status, job_title)
  VALUES (NEW.id, NEW.owner_id, _org_role, 'active', _job_title)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    job_title = EXCLUDED.job_title;

  RETURN NEW;
END;
$$;
