import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-cloud";
import { Bell, Building2, Check, Menu, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GlobalSearch } from "@/components/layout/global-search";
import { QuickCreate } from "@/components/layout/quick-create";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useWorkspace } from "@/app/workspace";
import { useNotifications } from "@/hooks/use-data";
import { fromNow } from "@/lib/format";

export function Topbar({
  onToggleSidebar,
  onOpenMobileNav,
  collapsed,
}: {
  onToggleSidebar: () => void;
  onOpenMobileNav: () => void;
  collapsed: boolean;
}) {
  const { organization, organizations, setOrganizationId, currentUser, roleName } = useWorkspace();
  const { data: notifications = [] } = useNotifications();
  const unread = notifications.filter((n) => !n.read);
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 grid h-14 grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-1 border-b bg-surface/85 px-2 backdrop-blur-xl sm:gap-2 sm:px-3 lg:flex lg:px-5">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMobileNav} aria-label="Open menu">
        <Menu className="size-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        {collapsed ? <PanelLeft className="size-5" /> : <PanelLeftClose className="size-5" />}
      </Button>

      <div className="hidden min-w-0 flex-1 md:block">
        <GlobalSearch />
      </div>
      <div className="min-w-0 md:hidden" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="hidden gap-2 xl:inline-flex">
            <Building2 className="size-4" />
            {organization.name}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Workspace</DropdownMenuLabel>
          {organizations.map((o) => (
            <DropdownMenuItem key={o.id} onSelect={() => setOrganizationId(o.id)}>
              {o.name}
              {o.id === organization.id ? <Check className="ml-auto size-4" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <QuickCreate />

      <ThemeToggle />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="size-5" />
            {unread.length > 0 ? (
              <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-destructive-foreground">
                {unread.length}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(20rem,calc(100vw-1rem))] p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <Link to="/notifications" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="scrollbar-thin max-h-80 divide-y overflow-y-auto">
            {notifications.slice(0, 6).map((n) => (
              <div key={n.id} className="px-4 py-3">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{fromNow(n.created_at)}</p>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
           <button className="ml-0.5 shrink-0 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring sm:ml-1">
            <UserAvatar userId={currentUser.id} name={currentUser.full_name} size="sm" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold">{currentUser.full_name}</p>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary">
                {roleName}
              </span>
            </div>
            <p className="truncate text-xs font-normal text-muted-foreground">{currentUser.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Current role: <span className="font-semibold text-foreground">{roleName}</span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/admin/workspace">Workspace Admin</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/notifications">Notification preferences</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {user ? (
            <>
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Signed in as {user.email}
              </DropdownMenuLabel>
              <DropdownMenuItem onSelect={handleSignOut}>Sign out</DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem asChild>
              <Link to="/auth">Sign in</Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
