import { useState } from "react";
import { ArrowLeft, Plug, Send } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { EmptyState, SkeletonTable } from "@/components/shared/states";
import { userName } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime, fromNow } from "@/lib/format";
import { useConversationMessages, useConversations } from "@/hooks/use-data";
import { useWorkspaceIntegrations } from "@/lib/integrations/use-integrations";
import { cn } from "@/lib/utils";

export function ConversationWorkspace({
  title,
  description,
  channels,
}: {
  title: string;
  description: string;
  channels: string[];
}) {
  const { data: all = [], isLoading } = useConversations();
  const { integrations } = useWorkspaceIntegrations();
  const waState = integrations.whatsapp;
  const isWaConnected = waState?.connected ?? false;

  const conversations = all.filter((c) => channels.includes(c.channel));
  const [selected, setSelected] = useState<string | null>(null);
  const activeId = selected ?? conversations[0]?.id ?? "";
  const { data: messages = [] } = useConversationMessages(activeId);
  const [draft, setDraft] = useState("");

  const active = conversations.find((c) => c.id === activeId);

  if (isLoading) return <SkeletonTable />;

  return (
    <PermissionGuard permission="marketing.read" mode="page">
      <div className="mx-auto max-w-[1600px]">
        <PageHeader
          title={title}
          description={description}
          actions={
            channels.includes("WhatsApp") ? (
              isWaConnected ? (
                <Badge
                  variant="outline"
                  className="gap-1.5 py-1 px-3 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs font-medium"
                >
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>WhatsApp Cloud API Active: {waState.config.phone_number || "+1 (555) 019-2834"}</span>
                </Badge>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">API Disconnected</Badge>
                  <Link to="/admin/integrations">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs text-primary border-primary/30">
                      <Plug className="size-3.5" />
                      <span>Connect WhatsApp</span>
                    </Button>
                  </Link>
                </div>
              )
            ) : null
          }
        />
        {conversations.length === 0 ? (
          <EmptyState title="No conversations yet" description="Inbound messages will appear here." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[300px_1fr_280px]">
            <aside className={cn("surface-card overflow-hidden", selected && "hidden lg:block")}>
              <ul className="divide-y">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelected(c.id)}
                      className={cn("w-full px-4 py-3 text-left hover:bg-accent/60", c.id === activeId && "bg-primary-soft/50")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{c.contact_name}</p>
                        {c.unread > 0 ? <Badge variant="secondary">{c.unread}</Badge> : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{c.last_message}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{c.channel} · {fromNow(c.last_message_at)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            <section className={cn("surface-card flex h-[calc(100dvh-12rem)] min-h-[420px] flex-col sm:h-[calc(100vh-16rem)]", !selected && "hidden lg:flex")}>
              <header className="flex items-center gap-3 border-b px-4 py-3">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelected(null)} aria-label="Back to conversations">
                  <ArrowLeft className="size-4" />
                </Button>
                 <div className="min-w-0">
                   <p className="truncate text-sm font-semibold">{active?.contact_name}</p>
                  <p className="text-xs text-muted-foreground">{active?.contact_phone}</p>
                </div>
              </header>
              <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.direction === "out" && "justify-end")}>
                    <div
                      className={cn(
                         "max-w-[84%] break-words rounded-2xl px-3.5 py-2 text-sm sm:max-w-[75%]",
                        m.direction === "out" ? "bg-primary text-primary-foreground" : "bg-surface-muted",
                      )}
                    >
                      <p>{m.body}</p>
                      <p className={cn("mt-1 text-[10px]", m.direction === "out" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {fmtDateTime(m.sent_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <form
                 className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t px-3 py-3 sm:px-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  toast.success("Reply queued for delivery");
                  setDraft("");
                }}
              >
                <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a reply…" aria-label="Reply" />
                <Button type="submit" size="icon" disabled={!draft.trim()}>
                  <Send className="size-4" />
                </Button>
              </form>
            </section>

            <aside className="surface-card hidden h-fit p-4 lg:block">
              <h2 className="text-sm font-semibold">Lead context</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Channel</dt>
                  <dd>{active?.channel}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Phone</dt>
                  <dd>{active?.contact_phone}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Owner</dt>
                  <dd>{active?.assigned_user_id ? userName(active.assigned_user_id) : "Unassigned"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Linked lead</dt>
                  <dd>{active?.lead_id ? "Linked in CRM" : "Not linked yet"}</dd>
                </div>
              </dl>
              <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => toast.success("Conversation converted to a lead")}>
                Convert to lead
              </Button>
            </aside>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
