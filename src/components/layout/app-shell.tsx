import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { cn } from "@/lib/utils";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useOrgSettings, useSession } from "@/hooks/use-cloud";

/** Loads the active organization's defaults (currency, timezone) once per session. */
function WorkspaceDefaults() {
  const { activeOrgId } = useActiveOrg();
  useOrgSettings(activeOrgId);
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useSession();
  const { activeOrg } = useActiveOrg();

  const sidebarFooter = user && activeOrg
    ? activeOrg.name
    : "Demo workspace · mock data";

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background">
      <WorkspaceDefaults />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border/70 bg-sidebar/78 shadow-sm backdrop-blur-xl transition-[width] duration-200 lg:flex",
          collapsed ? "w-[68px]" : "w-64",
        )}
      >
        <BrandMark collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} />
        {!collapsed ? (
          <div className="border-t px-4 py-3 text-[11px] text-muted-foreground">
            {sidebarFooter}
          </div>
        ) : null}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex h-dvh max-h-dvh w-[min(20rem,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden border-sidebar-border/70 bg-sidebar/92 p-0 backdrop-blur-xl">
          <SheetHeader className="shrink-0 border-b px-4 py-3.5">
            <SheetTitle className="text-left text-base">Teamlio</SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className={cn("flex min-h-screen min-w-0 flex-col transition-[padding] duration-200", collapsed ? "lg:pl-[68px]" : "lg:pl-64")}>
        <Topbar
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((c) => !c)}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 sm:pt-5 lg:px-6 lg:pb-8">{children}</main>
      </div>

      <MobileBottomNav onMore={() => setMobileOpen(true)} />
    </div>
  );
}

function BrandMark({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      to="/"
      className={cn("flex h-14 items-center gap-2.5 border-b px-4", collapsed && "justify-center px-0")}
    >
      <img src="/logo.png" alt="Teamlio" className="size-8 shrink-0 object-contain" />
      {!collapsed ? (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">Teamlio</span>
          <span className="block truncate text-[11px] text-muted-foreground">Project Management CRM</span>
        </span>
      ) : null}
    </Link>
  );
}
