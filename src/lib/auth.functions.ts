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
  inviteLink?: string;
  message: string;
  error?: string;
};

/**
 * Server function to invite a new employee or member to an organization.
 * 1. Inserts the invite into public.organization_invites so the invite record exists.
 * 2. Attempts to trigger Supabase's official auth.admin.inviteUserByEmail so the user
 *    receives a real email with an activation link.
 * 3. Also generates a direct recovery/activation link via generateLink so the user
 *    is never blocked even if Gmail / SMTP delivery fails or rate limits apply.
 * 4. If the user already exists in auth.users, directly associates them with the organization.
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

    // Generate direct invite link as a bulletproof fallback if Gmail blocks email
    let directInviteLink: string | undefined;
    try {
      const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          redirectTo: data.redirectTo || undefined,
          data: {
            requested_role: role,
            job_title: jobTitle || undefined,
          },
        },
      });
      if (linkData?.properties?.action_link) {
        directInviteLink = linkData.properties.action_link;
      }
    } catch {
      // Continue even if link generation has edge cases
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

        return {
          success: true,
          emailSent: false,
          inviteLink: directInviteLink,
          error: authError.message,
          message: `Invite saved in workspace. (Note: ${authError.message})`,
        };
      }

      return {
        success: true,
        emailSent: true,
        inviteLink: directInviteLink,
        message: `Activation email sent to ${email}!`,
      };
    } catch (err) {
      return {
        success: true,
        emailSent: false,
        inviteLink: directInviteLink,
        error: err instanceof Error ? err.message : "Email dispatch unavailable",
        message: `Invite saved in workspace.`,
      };
    }
  });

/**
 * Server function to auto-confirm a user's email address in auth.users.
 * This completely bypasses Supabase rate-limits or Gmail spam filters,
 * ensuring users can sign up and immediately access their workspace.
 */
export const autoConfirmUserFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    try {
      // Find the user by listing recent auth users
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 50,
      });

      if (listError) {
        console.warn("[AutoConfirm] Could not list users:", listError.message);
        return { success: false, error: listError.message };
      }

      const user = usersData.users.find((u) => u.email?.toLowerCase() === email);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      // Mark the user as confirmed
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });

      if (updateError) {
        console.warn("[AutoConfirm] Could not update user:", updateError.message);
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (err) {
      console.error("[AutoConfirm] Unexpected error:", err);
      return { success: false, error: err instanceof Error ? err.message : "Failed to confirm" };
    }
  });

/**
 * Server function to request a password reset with instant recovery link.
 * Dispatches an email via Supabase Auth, and ALSO generates an instant action link
 * so if Gmail delays or blocks the email, the user can reset their password immediately.
 */
export const requestPasswordResetFn = createServerFn({ method: "POST" })
  .inputValidator(
    (input: unknown) =>
      z
        .object({
          email: z.string().email(),
          redirectTo: z.string().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    // 1. Generate direct action link
    let recoveryLink: string | undefined;
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: data.redirectTo || undefined,
        },
      });

      if (!linkError && linkData?.properties?.action_link) {
        recoveryLink = linkData.properties.action_link;
      }
    } catch (err) {
      console.warn("[PasswordReset] Could not generate recovery link:", err);
    }

    // 2. Also attempt to send reset email via Supabase
    let emailSent = false;
    try {
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: data.redirectTo || undefined,
      });
      emailSent = !resetError;
    } catch {
      emailSent = false;
    }

    return {
      success: true,
      emailSent,
      recoveryLink,
    };
  });
