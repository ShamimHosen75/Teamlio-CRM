import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/app/workspace";
import type { Permission } from "@/lib/permissions";

const OPTIONS: { label: string; to: string; permission?: Permission; search?: Record<string, string> }[] = [
  { label: "Team", to: "/teams", search: { create: "true" } },
  { label: "Project", to: "/projects", permission: "project.create" },
  { label: "Task", to: "/tasks", permission: "task.create" },
  { label: "Lead", to: "/crm/leads", permission: "lead.create" },
  { label: "Client", to: "/crm/clients", permission: "client.read" },
  { label: "Deal", to: "/crm/deals", permission: "deal.read" },
  { label: "Meeting", to: "/meetings", permission: "meeting.manage" },
  { label: "Daily Update", to: "/daily-updates", permission: "daily_update.read" },
  { label: "Leave Request", to: "/leave", permission: "leave.read" },
  { label: "Quotation", to: "/business/quotations", permission: "quotation.create" },
  { label: "Invoice", to: "/business/invoices", permission: "invoice.create" },
  { label: "Content", to: "/marketing/content-calendar", permission: "marketing.read" },
];

export function QuickCreate() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const options = OPTIONS.filter((o) => !o.permission || can(o.permission));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Create</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Quick create</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((o) => (
          <DropdownMenuItem
            key={o.label}
            onSelect={() => {
              navigate({ to: o.to, search: (o.search as any) });
              toast.info(`Opening ${o.label.toLowerCase()} creation`);
            }}
          >
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
