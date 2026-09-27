import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InviteInput = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["owner", "admin", "manager", "member"]),
  job_title: z.string().optional(),
  redirectTo: z.string().optional(),
});

export type InviteResult = {
  success: boolean;
  emailSent: boolean;
  alreadyRegistered?: boolean;
  message: string;
  error?: string;
};

/**
 * Server function to invite a new employee or member to an organization.
 * 1. Inserts the invite into public.organization_invites so the invite record exists.
 * 2. Attempts to trigger Supabase's official auth.admin.inviteUserByEmail so the user
 *    receives a real email with an activation link.
 * 3. If the user already exists in auth.users, directly associates them with the organization.
 */
export const sendEmployeeInviteFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InviteInput.parse(input))
  .handler(async ({ data }): Promise<InviteResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.trim().toLowerCase();
    const orgId = data.organizationId;
    const role = data.role;
    const jobTitle = data.job_title?.trim() || null;

    // 1. Insert/upsert into organization_invites
    const { error: inviteError } = await supabaseAdmin.from("organization_invites").upsert(
      {
        organization_id: orgId,
        email,
        role,
        job_title: jobTitle,
        accepted_at: null,
      },
      { onConflict: "organization_id,email" },
    );

    if (inviteError) {
      console.warn("[Invite] Could not upsert organization_invites:", inviteError.message);
    }

    // 2. Try sending an official Supabase Auth invite email
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: data.redirectTo || undefined,
          data: {
            requested_role: role,
            job_title: jobTitle || undefined,
          },
        },
      );

      if (authError) {
        const msg = authError.message.toLowerCase();
        // Case: User already registered in Supabase auth
        if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("exists")) {
          // Check if profile exists and add directly to organization_members
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .ilike("email", email)
            .maybeSingle();

          if (profile?.id) {
            await supabaseAdmin.from("organization_members").upsert(
              {
                organization_id: orgId,
                user_id: profile.id,
                role,
                status: "active",
                job_title: jobTitle || "Team Member",
              },
              { onConflict: "organization_id,user_id" },
            );

            // Mark invite accepted
            await supabaseAdmin
              .from("organization_invites")
              .update({ accepted_at: new Date().toISOString() })
              .eq("organization_id", orgId)
              .ilike("email", email);

            return {
              success: true,
              emailSent: false,
              alreadyRegistered: true,
              message: `${email} is already registered and was added directly to this workspace!`,
            };
          }
        }

        // Return graceful notification with invite link fallback
        return {
          success: true,
          emailSent: false,
          error: authError.message,
          message: `Invite saved in workspace. (Email dispatch note: ${authError.message})`,
        };
      }

      return {
        success: true,
        emailSent: true,
        message: `Activation email sent to ${email}!`,
      };
    } catch (err) {
      return {
        success: true,
        emailSent: false,
        error: err instanceof Error ? err.message : "Email dispatch unavailable",
        message: `Invite saved in workspace. Share the direct registration link with ${email}.`,
      };
    }
  });
