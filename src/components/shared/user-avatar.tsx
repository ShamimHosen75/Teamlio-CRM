import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { users } from "@/lib/mock/seed";

export function userName(id: string | null | undefined): string {
  if (!id) return "Unassigned";
  return users.find((u) => u.id === id)?.full_name ?? "Unknown";
}

export function UserAvatar({
  userId,
  name,
  size = "sm",
  className,
}: {
  userId?: string | null;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { xs: "size-6 text-[10px]", sm: "size-7 text-xs", md: "size-9 text-sm", lg: "size-12 text-base" };
  const displayName = name || userName(userId);
  return (
    <Avatar className={cn(sizes[size], "border border-border", className)}>
      <AvatarFallback className="bg-primary-soft font-medium text-primary">{initials(displayName)}</AvatarFallback>
    </Avatar>
  );
}

export function UserCell({ userId, subtitle }: { userId: string | null | undefined; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2">
      <UserAvatar userId={userId} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{userName(userId)}</p>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function UserAvatarGroup({ userIds, max = 4 }: { userIds: string[]; max?: number }) {
  const shown = userIds.slice(0, max);
  const rest = userIds.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((id) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            <span>
              <UserAvatar userId={id} size="xs" className="ring-2 ring-surface" />
            </span>
          </TooltipTrigger>
          <TooltipContent>{userName(id)}</TooltipContent>
        </Tooltip>
      ))}
      {rest > 0 ? (
        <span className="flex size-6 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-surface">
          +{rest}
        </span>
      ) : null}
    </div>
  );
}
