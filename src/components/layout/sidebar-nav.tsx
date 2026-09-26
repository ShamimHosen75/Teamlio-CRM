import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { NAV_SECTIONS } from "@/app/navigation";
import { usePermissions } from "@/app/workspace";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NewCompanyDrawer } from "@/components/crm/new-company-drawer";

export function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const { can } = usePermissions();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [closed, setClosed] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<string[]>(["/crm/companies"]);
  const [newCompanyOpen, setNewCompanyOpen] = useState(false);

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((section) => section.items.length > 0);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const handleAction = (actionId?: string) => {
    if (actionId === "new-company") {
      setNewCompanyOpen(true);
    }
  };

  return (
    <>
      <nav className="scrollbar-sidebar min-h-0 flex-1 touch-pan-y space-y-5 overflow-y-auto overscroll-y-contain px-3 py-4 [-webkit-overflow-scrolling:touch]">
        {sections.map((section) => {
          const isClosed = closed.includes(section.label);
          return (
            <div key={section.label}>
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() =>
                    setClosed((c) =>
                      c.includes(section.label) ? c.filter((s) => s !== section.label) : [...c, section.label],
                    )
                  }
                  className="mb-1 flex min-h-11 w-full items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground lg:min-h-0 lg:py-1"
                >
                  {section.label}
                  <ChevronDown className={cn("size-3 transition-transform", isClosed && "-rotate-90")} />
                </button>
              ) : (
                <div className="mx-auto mb-2 h-px w-6 bg-border" />
              )}

              {!isClosed || collapsed ? (
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.to);
                    const isExpanded = expandedItems.includes(item.to) || active;
                    const hasChildren = Boolean(item.children && item.children.length > 0);

                    const link = (
                      <Link
                        to={item.to}
                        onClick={onNavigate}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                          collapsed && "justify-center px-0",
                        )}
                      >
                        <item.icon className={cn("size-4 shrink-0", active && "text-primary")} />
                        {!collapsed ? <span className="truncate">{item.label}</span> : null}
                      </Link>
                    );

                    return (
                      <li key={item.to}>
                        {collapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{link}</TooltipTrigger>
                            <TooltipContent side="right" className="flex items-center gap-1.5 py-1 px-2.5">
                              <span>{item.label}</span>
                              {item.quickAction ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAction(item.quickAction?.actionId);
                                  }}
                                  className="ml-1 rounded p-0.5 text-primary hover:bg-primary/20"
                                  title={item.quickAction.label}
                                >
                                  <Plus className="size-3.5" />
                                </button>
                              ) : null}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div>
                            <div className="group/item flex items-center rounded-lg hover:bg-sidebar-accent/30 transition-colors">
                              {link}

                              {/* Quick Action Button (e.g. + Add Company) */}
                              {item.quickAction ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleAction(item.quickAction?.actionId);
                                      }}
                                      className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95"
                                      aria-label={item.quickAction.label}
                                    >
                                      <Plus className="size-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right">
                                    {item.quickAction.label}
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}

                              {/* Submenu toggle arrow */}
                              {hasChildren ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setExpandedItems((prev) =>
                                      prev.includes(item.to)
                                        ? prev.filter((x) => x !== item.to)
                                        : [...prev, item.to],
                                    );
                                  }}
                                  className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-transform"
                                  aria-label={`Toggle ${item.label} sub-items`}
                                >
                                  <ChevronRight
                                    className={cn("size-3.5 transition-transform duration-150", isExpanded && "rotate-90")}
                                  />
                                </button>
                              ) : null}
                            </div>

                            {/* Sub-items (e.g. All Companies, Add Company) */}
                            {hasChildren && isExpanded ? (
                              <ul className="ml-5 mt-1 space-y-0.5 border-l border-sidebar-border/60 pl-2.5">
                                {item.children?.map((sub) => {
                                  const SubIcon = sub.icon;
                                  const isSubActive = sub.to && !sub.actionId ? pathname === sub.to : false;

                                  if (sub.actionId) {
                                    return (
                                      <li key={sub.label}>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleAction(sub.actionId);
                                            onNavigate?.();
                                          }}
                                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-primary text-left"
                                        >
                                          {SubIcon ? <SubIcon className="size-3.5 text-primary" /> : null}
                                          <span>{sub.label}</span>
                                        </button>
                                      </li>
                                    );
                                  }

                                  return (
                                    <li key={sub.label}>
                                      <Link
                                        to={sub.to!}
                                        onClick={onNavigate}
                                        className={cn(
                                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                                          isSubActive
                                            ? "bg-sidebar-accent font-semibold text-primary"
                                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-foreground",
                                        )}
                                      >
                                        {SubIcon ? (
                                          <SubIcon className={cn("size-3.5", isSubActive && "text-primary")} />
                                        ) : null}
                                        <span>{sub.label}</span>
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : null}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>

      {/* Global New Company Drawer triggered from sidebar */}
      <NewCompanyDrawer open={newCompanyOpen} onOpenChange={setNewCompanyOpen} />
    </>
  );
}
