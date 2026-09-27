// Replaced Lovable Cloud OAuth proxy with direct Supabase OAuth.
// This works standalone — no Lovable Cloud account needed.
import { supabase } from "../supabase/client";

type OAuthProvider = "google" | "github" | "gitlab" | "bitbucket" | "azure" | "twitter";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: OAuthProvider, opts?: SignInOptions) => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: opts?.redirect_uri ?? `${window.location.origin}/auth`,
          queryParams: opts?.extraParams,
        },
      });

      if (error) {
        return { error, redirected: false };
      }

      // Supabase redirects the browser automatically for OAuth flows.
      return { redirected: true, error: null };
    },
  },
};
