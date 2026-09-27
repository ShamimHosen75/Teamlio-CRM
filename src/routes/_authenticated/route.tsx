import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const redirectTarget = location.pathname + (location.searchStr ? `?${location.searchStr}` : "");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        return { user: sessionData.session.user };
      }

      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        throw redirect({
          to: "/auth",
          search: { redirect: redirectTarget },
        });
      }
      return { user: data.user };
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({
        to: "/auth",
        search: { redirect: redirectTarget },
      });
    }
  },
  component: () => <Outlet />,
});
